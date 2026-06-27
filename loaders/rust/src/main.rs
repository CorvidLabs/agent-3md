// agent3md - a native CLI over any agent.3md file, built on the canonical
// `threemd` parser. Mirrors the TypeScript CLI (src/cli.ts) and validator
// (src/validate.ts) so the agent3md/1 standard has a fast, cross-language tool.
//
//   agent3md <command> <file.3md> [args]
//
// commands: manifest | skills | route | get | resolve | validate
use std::collections::{BTreeMap, BTreeSet};
use std::process::exit;
use threemd::{parse, Document};

struct SkillInput {
    name: String,
    type_: String,
    required: bool,
}

struct Skill {
    z: i64,
    name: String,
    triggers: Vec<String>,
    input_schema: Vec<SkillInput>,
    tool: Option<String>,
    cost: Option<String>,
    deps: Vec<i64>,
    body: String,
}

fn csv(v: Option<&String>) -> Vec<String> {
    v.map(|s| {
        s.split(',')
            .map(|x| x.trim().to_string())
            .filter(|x| !x.is_empty())
            .collect()
    })
    .unwrap_or_default()
}

/// Parse a typed input list: `inputs="question, limit:number?"`. Each item is
/// `name`, `name:type`, or `name:type?` (a trailing `?` marks it optional). A
/// bare name is a required string. One grammar, shared with the TS and Swift
/// loaders so the typed contract never diverges.
fn parse_inputs(v: Option<&String>) -> Vec<SkillInput> {
    csv(v)
        .into_iter()
        .filter_map(|item| {
            let (s, required) = match item.strip_suffix('?') {
                Some(rest) => (rest.trim_end().to_string(), false),
                None => (item, true),
            };
            let (name, type_) = match s.find(':') {
                Some(i) => {
                    let t = s[i + 1..].trim().to_lowercase();
                    (
                        s[..i].trim().to_string(),
                        if t.is_empty() {
                            "string".to_string()
                        } else {
                            t
                        },
                    )
                }
                None => (s.trim().to_string(), "string".to_string()),
            };
            if name.is_empty() {
                None
            } else {
                Some(SkillInput {
                    name,
                    type_,
                    required,
                })
            }
        })
        .collect()
}

/// Placeholder names referenced by a `{name}` command template, in order. One
/// grammar, shared with the TS loader: `[A-Za-z_]\w*` inside `{ }`.
fn command_placeholders(template: &str) -> Vec<String> {
    let b = template.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'{' {
            let start = i + 1;
            let mut j = start;
            while j < b.len() && b[j] != b'}' {
                j += 1;
            }
            if j < b.len() && j > start {
                let name = &template[start..j];
                let mut chars = name.chars();
                let ok = chars
                    .next()
                    .map(|c| c.is_ascii_alphabetic() || c == '_')
                    .unwrap_or(false)
                    && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
                if ok {
                    out.push(name.to_string());
                }
                i = j + 1;
                continue;
            }
        }
        i += 1;
    }
    out
}

/// Fill a `{name}` command template from `values` (shell-quoted). Unprovided
/// placeholders are left visible. Mirrors the TS and Swift loaders.
fn fill_command(template: &str, values: &BTreeMap<String, String>) -> String {
    let mut out = String::new();
    let mut rest = template;
    while let Some(open) = rest.find('{') {
        if let Some(rel_close) = rest[open + 1..].find('}') {
            let close = open + 1 + rel_close;
            let name = &rest[open + 1..close];
            let valid = !name.is_empty()
                && name
                    .bytes()
                    .next()
                    .map(|b| b.is_ascii_alphabetic() || b == b'_')
                    .unwrap_or(false)
                && name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_');
            if valid {
                out.push_str(&rest[..open]);
                match values.get(name) {
                    Some(v) => {
                        out.push('\'');
                        out.push_str(&v.replace('\'', "'\\''"));
                        out.push('\'');
                    }
                    None => out.push_str(&rest[open..=close]),
                }
                rest = &rest[close + 1..];
                continue;
            }
        }
        out.push_str(&rest[..=open]);
        rest = &rest[open + 1..];
    }
    out.push_str(rest);
    out
}

/// Pull dependency targets out of a plane body. One grammar, shared with the TS
/// runtime, validator, and spec: `[[z=N]]` or `[[z=N|label]]` (closing required).
fn parse_deps(body: &str) -> Vec<i64> {
    let mut out = Vec::new();
    let b = body.as_bytes();
    let pat = b"[[z=";
    let mut i = 0;
    while i + pat.len() <= b.len() {
        if &b[i..i + pat.len()] != pat {
            i += 1;
            continue;
        }
        let start = i + pat.len();
        let mut j = start;
        while j < b.len() && b[j].is_ascii_digit() {
            j += 1;
        }
        // optional `|label` (anything up to `]`), then require the closing `]]`
        let mut k = j;
        if k < b.len() && b[k] == b'|' {
            while k < b.len() && b[k] != b']' {
                k += 1;
            }
        }
        if j > start && k + 1 < b.len() && b[k] == b']' && b[k + 1] == b']' {
            if let Ok(n) = std::str::from_utf8(&b[start..j])
                .unwrap_or("")
                .parse::<i64>()
            {
                out.push(n);
            }
            i = k + 2;
        } else {
            i += 1;
        }
    }
    out
}

fn is_identity(p: &threemd::Plane) -> bool {
    p.attributes.get("kind").map(String::as_str) == Some("identity")
}

/// The identity plane: the explicit `kind=identity` plane, else the first plane.
fn identity_z(doc: &Document) -> Option<i64> {
    doc.planes
        .iter()
        .find(|p| is_identity(p))
        .or_else(|| doc.planes.first())
        .map(|p| p.z as i64)
}

fn build_skills(doc: &Document) -> Vec<Skill> {
    let id = identity_z(doc);
    doc.planes
        .iter()
        .filter(|p| Some(p.z as i64) != id)
        .map(|p| {
            let z = p.z as i64;
            let input_schema = parse_inputs(p.attributes.get("inputs"));
            Skill {
                z,
                name: p.label.clone().unwrap_or_else(|| format!("skill-{z}")),
                triggers: csv(p.attributes.get("triggers")),
                input_schema,
                tool: p
                    .attributes
                    .get("tool")
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty()),
                cost: p.attributes.get("cost").cloned(),
                deps: parse_deps(&p.body),
                body: p.body.clone(),
            }
        })
        .collect()
}

/// Tokenize: maximal runs of Unicode letters/digits, lowercased. Identical to
/// the TS and Swift loaders so routing never diverges.
fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect()
}

/// Route by trigger-phrase coverage: a trigger phrase matches only when ALL of
/// its words appear in the request. Score = matched phrases; ties broken by z.
fn route<'a>(skills: &'a [Skill], text: &str) -> Vec<(&'a Skill, Vec<String>)> {
    let req: BTreeSet<String> = tokenize(text).into_iter().collect();
    let mut scored: Vec<(&Skill, Vec<String>)> = Vec::new();
    for s in skills {
        let hits: Vec<String> = s
            .triggers
            .iter()
            .filter(|t| {
                let tw = tokenize(t);
                !tw.is_empty() && tw.iter().all(|w| req.contains(w))
            })
            .cloned()
            .collect();
        if !hits.is_empty() {
            scored.push((s, hits));
        }
    }
    scored.sort_by(|a, b| b.1.len().cmp(&a.1.len()).then(a.0.z.cmp(&b.0.z)));
    scored
}

fn get<'a>(skills: &'a [Skill], name: &str) -> Option<&'a Skill> {
    skills.iter().find(|s| s.name == name)
}

/// A skill plus its transitive dependencies (via [[z=N]] links), in load order.
fn resolve<'a>(skills: &'a [Skill], name: &str) -> Vec<&'a Skill> {
    let by_z: BTreeMap<i64, &Skill> = skills.iter().map(|s| (s.z, s)).collect();
    let mut out = Vec::new();
    let mut seen = BTreeSet::new();
    fn visit<'a>(
        s: &'a Skill,
        by_z: &BTreeMap<i64, &'a Skill>,
        seen: &mut BTreeSet<i64>,
        out: &mut Vec<&'a Skill>,
    ) {
        if !seen.insert(s.z) {
            return;
        }
        out.push(s);
        for d in &s.deps {
            if let Some(dep) = by_z.get(d) {
                visit(dep, by_z, seen, out);
            }
        }
    }
    if let Some(start) = get(skills, name) {
        visit(start, &by_z, &mut seen, &mut out);
    }
    out
}

// --- agent3md/1 conformance checks (mirror src/validate.ts) ---
#[derive(Debug)]
struct Issue {
    rule: &'static str,
    msg: String,
    z: Option<i64>,
}

/// Return a plane z that lies on a dependency cycle, if any (DFS, three-color).
fn find_cycle(links: &BTreeMap<i64, Vec<i64>>) -> Option<i64> {
    fn dfs(z: i64, links: &BTreeMap<i64, Vec<i64>>, color: &mut BTreeMap<i64, u8>) -> Option<i64> {
        color.insert(z, 1);
        if let Some(ts) = links.get(&z) {
            for &t in ts {
                match color.get(&t).copied().unwrap_or(0) {
                    1 => return Some(t),
                    0 => {
                        if let Some(c) = dfs(t, links, color) {
                            return Some(c);
                        }
                    }
                    _ => {}
                }
            }
        }
        color.insert(z, 2);
        None
    }
    let mut color: BTreeMap<i64, u8> = BTreeMap::new();
    for &z in links.keys() {
        if color.get(&z).copied().unwrap_or(0) == 0 {
            if let Some(c) = dfs(z, links, &mut color) {
                return Some(c);
            }
        }
    }
    None
}

fn validate(doc: &Document) -> (Vec<Issue>, Vec<Issue>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    let mut err =
        |rule: &'static str, msg: String, z: Option<i64>| errors.push(Issue { rule, msg, z });

    // required frontmatter: 3md version, model, and (title or agent)
    if doc.version.trim().is_empty() {
        err("frontmatter", "missing `3md:` version line".into(), None);
    }
    // `model` is an optional hint the host may override, so it is not required.
    if doc.title.is_none() && !doc.metadata.contains_key("agent") {
        err(
            "frontmatter",
            "need a `title:` or `agent:` to name the agent".into(),
            None,
        );
    }

    // identity: one explicit kind=identity, or (fallback) the first plane
    let explicit: Vec<&threemd::Plane> = doc.planes.iter().filter(|p| is_identity(p)).collect();
    if explicit.len() > 1 {
        err(
            "identity",
            format!("expected one identity plane, found {}", explicit.len()),
            Some(explicit[1].z as i64),
        );
    } else if explicit.is_empty() && doc.planes.is_empty() {
        err(
            "identity",
            "document has no planes (need at least an identity plane)".into(),
            None,
        );
    }
    let id = identity_z(doc);
    let is_skill = |p: &&threemd::Plane| Some(p.z as i64) != id;

    // every skill has a unique, non-empty label
    let mut seen: BTreeMap<String, i64> = BTreeMap::new();
    for p in doc.planes.iter().filter(is_skill) {
        let z = p.z as i64;
        match p.label.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
            None => err(
                "missing-label",
                format!("skill at z={z} has no label (every skill needs a name)"),
                Some(z),
            ),
            Some(name) => {
                let name = name.to_string();
                if let Some(prev) = seen.get(&name) {
                    err(
                        "unique-skill",
                        format!("duplicate skill name \"{name}\" (also at z={prev})"),
                        Some(z),
                    );
                } else {
                    seen.insert(name, z);
                }
            }
        }
    }

    // every [[z=N]] link targets a real plane
    let plane_z: BTreeSet<i64> = doc.planes.iter().map(|p| p.z as i64).collect();
    for p in &doc.planes {
        for target in parse_deps(&p.body) {
            if !plane_z.contains(&target) {
                err(
                    "dead-link",
                    format!("link [[z={target}]] points to a plane that does not exist"),
                    Some(p.z as i64),
                );
            }
        }
    }

    // entry (if present) must be a plane z (integer) that exists
    if let Some(entry) = doc.metadata.get("entry") {
        match entry.trim().parse::<i64>() {
            Err(_) => err(
                "entry",
                format!("entry: \"{entry}\" must be a plane z (an integer)"),
                None,
            ),
            Ok(n) if !plane_z.contains(&n) => err(
                "entry",
                format!("entry: \"{entry}\" does not resolve to a real plane"),
                None,
            ),
            Ok(_) => {}
        }
    }

    // no dependency cycles (a -> ... -> a via [[z=N]] links)
    let links: BTreeMap<i64, Vec<i64>> = doc
        .planes
        .iter()
        .map(|p| {
            (
                p.z as i64,
                parse_deps(&p.body)
                    .into_iter()
                    .filter(|t| plane_z.contains(t))
                    .collect(),
            )
        })
        .collect();
    if let Some(node) = find_cycle(&links) {
        err(
            "cycle",
            format!("dependency cycle detected (involving plane z={node})"),
            Some(node),
        );
    }

    // each skill SHOULD have triggers (warning)
    for p in doc.planes.iter().filter(is_skill) {
        let z = p.z as i64;
        let triggers = p.attributes.get("triggers").map(|s| s.trim()).unwrap_or("");
        if triggers.is_empty() {
            let name = p.label.clone().unwrap_or_else(|| format!("skill-{z}"));
            warnings.push(Issue {
                rule: "triggers",
                msg: format!("skill \"{name}\" has no triggers; it can never be routed to"),
                z: Some(z),
            });
        }
    }

    // typed inputs + tool bindings (agent3md/1, additive): canonical types, no
    // duplicate input names, and a non-empty tool binding if `tool=` is present.
    let input_types = ["string", "number", "boolean", "object", "array"];
    for p in doc.planes.iter().filter(is_skill) {
        let z = p.z as i64;
        let name = p.label.clone().unwrap_or_else(|| format!("skill-{z}"));
        let mut seen: BTreeSet<String> = BTreeSet::new();
        for inp in parse_inputs(p.attributes.get("inputs")) {
            if !seen.insert(inp.name.clone()) {
                err(
                    "dup-input",
                    format!(
                        "skill \"{name}\" declares input \"{}\" more than once",
                        inp.name
                    ),
                    Some(z),
                );
            }
            if !input_types.contains(&inp.type_.as_str()) {
                err(
                    "input-type",
                    format!(
                        "input \"{}\" has unknown type \"{}\" (use one of: {})",
                        inp.name,
                        inp.type_,
                        input_types.join(", ")
                    ),
                    Some(z),
                );
            }
        }
        if let Some(tool) = p.attributes.get("tool") {
            let t = tool.trim();
            if t.is_empty() {
                warnings.push(Issue {
                    rule: "tool",
                    msg: format!("skill \"{name}\" has an empty tool binding"),
                    z: Some(z),
                });
            } else {
                // every {placeholder} must be a declared input; an input the
                // command never uses is a likely mistake (warning).
                let mut used: BTreeSet<String> = BTreeSet::new();
                for ph in command_placeholders(t) {
                    used.insert(ph.clone());
                    if !seen.contains(&ph) {
                        err(
                            "tool-input",
                            format!("skill \"{name}\" command references {{{ph}}}, which is not a declared input"),
                            Some(z),
                        );
                    }
                }
                for n in &seen {
                    if !used.contains(n) {
                        warnings.push(Issue {
                            rule: "unused-input",
                            msg: format!("skill \"{name}\" declares input \"{n}\" that its command never uses"),
                            z: Some(z),
                        });
                    }
                }
            }
        }
    }

    // honest manifest: a skill's binary SHOULD appear in frontmatter `tools`.
    let declared_tools: BTreeSet<String> = csv(doc.metadata.get("tools")).into_iter().collect();
    if !declared_tools.is_empty() {
        for p in doc.planes.iter().filter(is_skill) {
            let z = p.z as i64;
            let tool = p.attributes.get("tool").map(|s| s.trim()).unwrap_or("");
            if tool.is_empty() {
                continue;
            }
            let binary = tool.split_whitespace().next().unwrap_or("");
            if !declared_tools.contains(binary) {
                let name = p.label.clone().unwrap_or_else(|| format!("skill-{z}"));
                warnings.push(Issue {
                    rule: "undeclared-tool",
                    msg: format!("skill \"{name}\" runs \"{binary}\", which is not in the agent's tools list"),
                    z: Some(z),
                });
            }
        }
    }

    (errors, warnings)
}

const USAGE: &str = "agent3md - query a 3md-packaged agent

usage:
  agent3md <command> <file.3md> [args]

commands:
  manifest <file>            agent name/model/tools + skill catalog (no bodies)
  skills   <file>            just the skill names
  route    <file> <text>     rank skills matching the request + the load chain
  get      <file> <skill>    print one skill's body (progressive disclosure)
  resolve  <file> <skill>    a skill plus its transitive dependency chain
  run      <file> <text> [k=v ...] [--exec]
                             route, fill the skill's command from k=v, print it;
                             --exec runs it
  validate <file>            check the file against agent3md/1 (exit 1 on errors)

examples:
  agent3md manifest agent.3md
  agent3md route agent.3md \"find every TODO\"
  agent3md get agent.3md search
  agent3md run agent.3md \"find every TODO\" pattern=TODO path=src
  agent3md validate agent.3md";

fn fail(msg: &str) -> ! {
    eprintln!("{msg}\n\n{USAGE}");
    exit(1);
}

/// If the next arg looks like a file (ends `.3md` or exists), use it; else fall
/// back to `agent.3md` in the current directory (the natural default once the
/// binary is installed with `cargo install agent3md`).
fn split_file(args: &[String]) -> (String, &[String]) {
    match args.first() {
        Some(a) if a.ends_with(".3md") || std::path::Path::new(a).exists() => {
            (a.clone(), &args[1..])
        }
        _ => ("agent.3md".to_string(), args),
    }
}

fn load(file: &str) -> (Document, Vec<Skill>) {
    let src = match std::fs::read_to_string(file) {
        Ok(s) => s,
        Err(_) => fail(&format!("no such file: {file}")),
    };
    let doc = match parse(&src) {
        Ok(d) => d,
        Err(e) => fail(&format!("not valid 3md: {e:?}")),
    };
    let skills = build_skills(&doc);
    (doc, skills)
}

fn main() {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let cmd = match argv.first() {
        Some(c) if !matches!(c.as_str(), "help" | "-h" | "--help") => c.clone(),
        _ => {
            println!("{USAGE}");
            return;
        }
    };
    let (file, rest) = split_file(&argv[1..]);

    match cmd.as_str() {
        "manifest" => {
            let (doc, skills) = load(&file);
            let name = doc
                .title
                .clone()
                .or_else(|| doc.metadata.get("agent").cloned())
                .unwrap_or_default();
            let model = doc.metadata.get("model").cloned().unwrap_or_default();
            let tools = doc
                .metadata
                .get("tools")
                .cloned()
                .unwrap_or_else(|| "(none)".into());
            println!("{name}  ({model})");
            if let Some(p) = doc.metadata.get("persona") {
                println!("  persona: {p}");
            }
            println!("  tools:   {tools}");
            println!("  skills:  {}", skills.len());
            for s in &skills {
                let cost = s
                    .cost
                    .as_ref()
                    .map(|c| format!(" [{c}]"))
                    .unwrap_or_default();
                println!("    - {}{}", s.name, cost);
                println!("        triggers: {}", s.triggers.join(", "));
            }
        }
        "skills" => {
            let (_doc, skills) = load(&file);
            for s in &skills {
                println!("{}", s.name);
            }
        }
        "route" => {
            let text = rest.join(" ");
            let text = text.trim();
            if text.is_empty() {
                fail("route needs a request, e.g. route agent.3md \"find every TODO\"");
            }
            let (_doc, skills) = load(&file);
            let ranked = route(&skills, text);
            if ranked.is_empty() {
                println!("no skill matched: \"{text}\"");
                return;
            }
            println!("request: \"{text}\"");
            for (i, (s, hits)) in ranked.iter().enumerate() {
                let tag = if i == 0 { "->" } else { "  " };
                println!(
                    "  {tag} {}  (score {}; matched: {})",
                    s.name,
                    hits.len(),
                    hits.join(", ")
                );
            }
            let chain = resolve(&skills, &ranked[0].0.name);
            println!(
                "  loads: {}",
                chain
                    .iter()
                    .map(|s| s.name.as_str())
                    .collect::<Vec<_>>()
                    .join(" + ")
            );
        }
        "get" => {
            let name = rest.join(" ");
            let name = name.trim();
            if name.is_empty() {
                fail("get needs a skill name, e.g. get agent.3md search");
            }
            let (_doc, skills) = load(&file);
            match get(&skills, name) {
                None => fail(&format!("no such skill: {name}")),
                Some(s) => {
                    let cost = s
                        .cost
                        .as_ref()
                        .map(|c| format!(", cost={c}"))
                        .unwrap_or_default();
                    let tool = s
                        .tool
                        .as_ref()
                        .map(|t| format!(", tool={t}"))
                        .unwrap_or_default();
                    let inputs = if s.input_schema.is_empty() {
                        String::new()
                    } else {
                        let parts: Vec<String> = s
                            .input_schema
                            .iter()
                            .map(|x| {
                                format!(
                                    "{}:{}{}",
                                    x.name,
                                    x.type_,
                                    if x.required { "" } else { "?" }
                                )
                            })
                            .collect();
                        format!(", inputs={}", parts.join(", "))
                    };
                    println!("# {}  (z={}{}{}{})", s.name, s.z, cost, tool, inputs);
                    println!("{}", s.body);
                }
            }
        }
        "resolve" => {
            let name = rest.join(" ");
            let name = name.trim();
            if name.is_empty() {
                fail("resolve needs a skill name, e.g. resolve agent.3md search");
            }
            let (_doc, skills) = load(&file);
            if get(&skills, name).is_none() {
                fail(&format!("no such skill: {name}"));
            }
            let chain = resolve(&skills, name);
            println!("{name} loads {} plane(s):", chain.len());
            for s in &chain {
                let deps = if s.deps.is_empty() {
                    String::new()
                } else {
                    format!(
                        "  (-> {})",
                        s.deps
                            .iter()
                            .map(|d| d.to_string())
                            .collect::<Vec<_>>()
                            .join(",")
                    )
                };
                println!("  - {}{}", s.name, deps);
            }
        }
        "run" => {
            let mut exec = false;
            let mut values: BTreeMap<String, String> = BTreeMap::new();
            let mut words: Vec<&str> = Vec::new();
            for a in rest {
                if a == "--exec" {
                    exec = true;
                    continue;
                }
                if let Some(eq) = a.find('=') {
                    let key = &a[..eq];
                    let is_ident = !key.is_empty()
                        && key
                            .bytes()
                            .next()
                            .map(|b| b.is_ascii_alphabetic() || b == b'_')
                            .unwrap_or(false)
                        && key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_');
                    if is_ident {
                        values.insert(key.to_string(), a[eq + 1..].to_string());
                        continue;
                    }
                }
                words.push(a);
            }
            let text = words.join(" ");
            let text = text.trim();
            if text.is_empty() {
                fail("run needs a request, e.g. run agent.3md \"find every TODO\" pattern=TODO path=src");
            }
            let (_doc, skills) = load(&file);
            let ranked = route(&skills, text);
            if ranked.is_empty() {
                println!("no skill matched: \"{text}\"");
                return;
            }
            let top = ranked[0].0;
            println!("request: \"{text}\"");
            println!("  -> {}  (matched: {})", top.name, ranked[0].1.join(", "));
            let chain = resolve(&skills, &top.name);
            if chain.len() > 1 {
                println!(
                    "  loads: {}",
                    chain
                        .iter()
                        .map(|s| s.name.as_str())
                        .collect::<Vec<_>>()
                        .join(" + ")
                );
            }
            match &top.tool {
                None => {
                    println!("  (no command bound; this skill is guidance only)");
                    println!("{}", top.body);
                }
                Some(tool) => {
                    let missing: Vec<String> = command_placeholders(tool)
                        .into_iter()
                        .filter(|p| !values.contains_key(p))
                        .collect();
                    let command = fill_command(tool, &values);
                    println!("  command: {command}");
                    if !missing.is_empty() {
                        println!(
                            "  fill:    {}",
                            missing
                                .iter()
                                .map(|m| format!("{m}="))
                                .collect::<Vec<_>>()
                                .join(" ")
                        );
                    }
                    if exec {
                        if !missing.is_empty() {
                            fail(&format!(
                                "cannot --exec: missing values for {}",
                                missing.join(", ")
                            ));
                        }
                        println!("  --- exec ---");
                        match std::process::Command::new("sh")
                            .arg("-c")
                            .arg(&command)
                            .status()
                        {
                            Ok(s) => exit(s.code().unwrap_or(1)),
                            Err(e) => fail(&format!("exec failed: {e}")),
                        }
                    }
                }
            }
        }
        "validate" => {
            let src = match std::fs::read_to_string(&file) {
                Ok(s) => s,
                Err(_) => {
                    eprintln!("cannot read {file}");
                    exit(2);
                }
            };
            let doc = match parse(&src) {
                Ok(d) => d,
                Err(e) => {
                    println!(
                        "agent3md validate: {file}\n  x [parse]  not valid 3md: {e:?}\n  FAIL"
                    );
                    exit(1);
                }
            };
            let (errors, warnings) = validate(&doc);
            println!("agent3md validate: {file}");
            for e in &errors {
                let z = e.z.map(|z| format!(" z={z}")).unwrap_or_default();
                println!("  x [{}]{}  {}", e.rule, z, e.msg);
            }
            for w in &warnings {
                let z = w.z.map(|z| format!(" z={z}")).unwrap_or_default();
                println!("  ! [{}]{}  {}", w.rule, z, w.msg);
            }
            let ok = errors.is_empty();
            println!(
                "  {} - {} error(s), {} warning(s)",
                if ok { "PASS" } else { "FAIL" },
                errors.len(),
                warnings.len()
            );
            exit(if ok { 0 } else { 1 });
        }
        other => fail(&format!("unknown command: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn check_valid(path: &str) {
        let src = fs::read_to_string(path).unwrap_or_else(|e| panic!("failed to read {path}: {e}"));
        let doc = parse(&src).expect("valid 3md document failed parsing");
        let (errors, _warnings) = validate(&doc);
        assert!(
            errors.is_empty(),
            "expected zero errors for {path}, got {errors:?}"
        );
    }

    fn check_invalid(path: &str, expected_rule: &str) {
        let src = fs::read_to_string(path).unwrap_or_else(|e| panic!("failed to read {path}: {e}"));
        let doc_res = parse(&src);
        if doc_res.is_err() {
            assert_eq!(
                expected_rule, "parse",
                "expected parsing error for {path}, but got parse error instead of {expected_rule}"
            );
            return;
        }
        let doc = doc_res.unwrap();
        let (errors, _warnings) = validate(&doc);
        assert!(!errors.is_empty(), "expected errors for {path}, got none");
        let rules: Vec<&str> = errors.iter().map(|e| e.rule).collect();
        assert!(
            rules.contains(&expected_rule),
            "expected error rule {expected_rule} for {path}, got {rules:?}"
        );
    }

    #[test]
    fn test_real_agent_3md() {
        check_valid("../../agent.3md");
    }

    #[test]
    fn test_valid_minimal() {
        check_valid("../../examples/conformance/valid-minimal.3md");
    }

    #[test]
    fn test_valid_deps() {
        check_valid("../../examples/conformance/valid-deps.3md");
    }

    #[test]
    fn test_valid_cost() {
        check_valid("../../examples/conformance/valid-cost.3md");
    }

    #[test]
    fn test_valid_entry() {
        check_valid("../../examples/conformance/valid-entry.3md");
    }

    #[test]
    fn test_valid_fallback_identity() {
        check_valid("../../examples/conformance/valid-fallback-identity.3md");
    }

    #[test]
    fn test_valid_typed_inputs() {
        check_valid("../../examples/conformance/valid-typed-inputs.3md");
    }

    #[test]
    fn test_valid_command() {
        check_valid("../../examples/conformance/valid-command.3md");
    }

    #[test]
    fn test_invalid_two_identities() {
        check_invalid(
            "../../examples/conformance/invalid-two-identities.3md",
            "identity",
        );
    }

    #[test]
    fn test_invalid_missing_label() {
        check_invalid(
            "../../examples/conformance/invalid-missing-label.3md",
            "missing-label",
        );
    }

    #[test]
    fn test_invalid_dup_skill() {
        check_invalid("../../examples/invalid/dup-skill.3md", "unique-skill");
        check_invalid(
            "../../examples/conformance/invalid-dup-skill.3md",
            "unique-skill",
        );
    }

    #[test]
    fn test_invalid_dead_link() {
        check_invalid("../../examples/invalid/dead-link.3md", "dead-link");
        check_invalid(
            "../../examples/conformance/invalid-dead-link.3md",
            "dead-link",
        );
    }

    #[test]
    fn test_invalid_cycle() {
        check_invalid("../../examples/conformance/invalid-cycle.3md", "cycle");
    }

    #[test]
    fn test_invalid_missing_frontmatter() {
        check_invalid(
            "../../examples/conformance/invalid-missing-frontmatter.3md",
            "frontmatter",
        );
    }

    #[test]
    fn test_invalid_bad_entry() {
        check_invalid("../../examples/conformance/invalid-bad-entry.3md", "entry");
    }

    #[test]
    fn test_invalid_bad_input_type() {
        check_invalid(
            "../../examples/conformance/invalid-bad-input-type.3md",
            "input-type",
        );
    }

    #[test]
    fn test_invalid_dup_input() {
        check_invalid(
            "../../examples/conformance/invalid-dup-input.3md",
            "dup-input",
        );
    }

    #[test]
    fn test_invalid_bad_placeholder() {
        check_invalid(
            "../../examples/conformance/invalid-bad-placeholder.3md",
            "tool-input",
        );
    }
}
