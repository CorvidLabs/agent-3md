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

struct Skill {
    z: i64,
    name: String,
    triggers: Vec<String>,
    inputs: Vec<String>,
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

/// Pull `[[z=N|..]]` dependency targets out of a plane body.
fn parse_deps(body: &str) -> Vec<i64> {
    let mut out = Vec::new();
    let b = body.as_bytes();
    let pat = b"[[z=";
    let mut i = 0;
    while i + pat.len() <= b.len() {
        if &b[i..i + pat.len()] == pat {
            let mut j = i + pat.len();
            let mut num = String::new();
            while j < b.len() && b[j].is_ascii_digit() {
                num.push(b[j] as char);
                j += 1;
            }
            if let Ok(n) = num.parse::<i64>() {
                out.push(n);
            }
            i = j;
        } else {
            i += 1;
        }
    }
    out
}

fn is_identity(p: &threemd::Plane) -> bool {
    p.attributes.get("kind").map(String::as_str) == Some("identity")
}

fn build_skills(doc: &Document) -> Vec<Skill> {
    doc.planes
        .iter()
        .filter(|p| !is_identity(p))
        .map(|p| {
            let z = p.z as i64;
            Skill {
                z,
                name: p.label.clone().unwrap_or_else(|| format!("skill-{z}")),
                triggers: csv(p.attributes.get("triggers")),
                inputs: csv(p.attributes.get("inputs")),
                cost: p.attributes.get("cost").cloned(),
                deps: parse_deps(&p.body),
                body: p.body.clone(),
            }
        })
        .collect()
}

fn words(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect()
}

/// Rank skills by the number of distinct request words that hit a trigger word.
fn route<'a>(skills: &'a [Skill], text: &str) -> Vec<(&'a Skill, Vec<String>)> {
    let req = words(text);
    let mut scored: Vec<(&Skill, Vec<String>)> = Vec::new();
    for s in skills {
        let mut tw = BTreeSet::new();
        for t in &s.triggers {
            for w in t.split_whitespace() {
                tw.insert(w.to_lowercase());
            }
        }
        let hits: Vec<String> = req.iter().filter(|w| tw.contains(*w)).cloned().collect::<BTreeSet<_>>().into_iter().collect();
        if !hits.is_empty() {
            scored.push((s, hits));
        }
    }
    scored.sort_by(|a, b| b.1.len().cmp(&a.1.len()));
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
    fn visit<'a>(s: &'a Skill, by_z: &BTreeMap<i64, &'a Skill>, seen: &mut BTreeSet<i64>, out: &mut Vec<&'a Skill>) {
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
struct Issue {
    rule: &'static str,
    msg: String,
    z: Option<i64>,
}

fn validate(doc: &Document) -> (Vec<Issue>, Vec<Issue>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    let mut err = |rule: &'static str, msg: String, z: Option<i64>| errors.push(Issue { rule, msg, z });

    // required frontmatter: 3md version, model, and (title or agent)
    if doc.version.trim().is_empty() {
        err("frontmatter", "missing `3md:` version line".into(), None);
    }
    if !doc.metadata.contains_key("model") {
        err("frontmatter", "missing required `model:` frontmatter".into(), None);
    }
    if doc.title.is_none() && !doc.metadata.contains_key("agent") {
        err("frontmatter", "need a `title:` or `agent:` to name the agent".into(), None);
    }

    // exactly one identity plane
    let identities: Vec<&threemd::Plane> = doc.planes.iter().filter(|p| is_identity(p)).collect();
    if identities.is_empty() {
        err("identity", "no identity plane found (mark one plane `kind=identity`)".into(), None);
    } else if identities.len() > 1 {
        err("identity", format!("expected exactly one identity plane, found {}", identities.len()), Some(identities[1].z as i64));
    }

    // unique skill names (labels), among non-identity planes
    let mut seen: BTreeMap<String, i64> = BTreeMap::new();
    for p in doc.planes.iter().filter(|p| !is_identity(p)) {
        let z = p.z as i64;
        let name = p.label.clone().unwrap_or_else(|| format!("skill-{z}"));
        if let Some(prev) = seen.get(&name) {
            err("unique-skill", format!("duplicate skill name \"{name}\" (also at z={prev})"), Some(z));
        } else {
            seen.insert(name, z);
        }
    }

    // every [[z=N]] link points to a real plane
    let plane_z: BTreeSet<i64> = doc.planes.iter().map(|p| p.z as i64).collect();
    for p in &doc.planes {
        for target in parse_deps(&p.body) {
            if !plane_z.contains(&target) {
                err("dead-link", format!("link [[z={target}]] points to a plane that does not exist"), Some(p.z as i64));
            }
        }
    }

    // entry (if present) resolves
    if let Some(entry) = doc.metadata.get("entry") {
        match entry.trim().parse::<i64>() {
            Ok(n) if plane_z.contains(&n) => {}
            _ => err("entry", format!("entry: \"{entry}\" does not resolve to a real plane"), None),
        }
    }

    // each skill SHOULD have triggers (warning)
    for p in doc.planes.iter().filter(|p| !is_identity(p)) {
        let z = p.z as i64;
        let triggers = p.attributes.get("triggers").map(|s| s.trim()).unwrap_or("");
        if triggers.is_empty() {
            let name = p.label.clone().unwrap_or_else(|| format!("skill-{z}"));
            warnings.push(Issue { rule: "triggers", msg: format!("skill \"{name}\" has no triggers; it can never be routed to"), z: Some(z) });
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
  validate <file>            check the file against agent3md/1 (exit 1 on errors)

examples:
  agent3md manifest agent.3md
  agent3md route agent.3md \"review my diff\"
  agent3md get agent.3md sql-query
  agent3md validate agent.3md";

fn fail(msg: &str) -> ! {
    eprintln!("{msg}\n\n{USAGE}");
    exit(1);
}

/// If the next arg looks like a file (ends `.3md` or exists), use it; else default.
fn split_file(args: &[String]) -> (String, &[String]) {
    let default = concat!(env!("CARGO_MANIFEST_DIR"), "/../../agent.3md").to_string();
    match args.first() {
        Some(a) if a.ends_with(".3md") || std::path::Path::new(a).exists() => (a.clone(), &args[1..]),
        _ => (default, args),
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
            let name = doc.title.clone().or_else(|| doc.metadata.get("agent").cloned()).unwrap_or_default();
            let model = doc.metadata.get("model").cloned().unwrap_or_default();
            let tools = doc.metadata.get("tools").cloned().unwrap_or_else(|| "(none)".into());
            println!("{name}  ({model})");
            if let Some(p) = doc.metadata.get("persona") {
                println!("  persona: {p}");
            }
            println!("  tools:   {tools}");
            println!("  skills:  {}", skills.len());
            for s in &skills {
                let cost = s.cost.as_ref().map(|c| format!(" [{c}]")).unwrap_or_default();
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
                fail("route needs a request, e.g. route agent.3md \"summarize this\"");
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
                println!("  {tag} {}  (score {}; matched: {})", s.name, hits.len(), hits.join(", "));
            }
            let chain = resolve(&skills, &ranked[0].0.name);
            println!("  loads: {}", chain.iter().map(|s| s.name.as_str()).collect::<Vec<_>>().join(" + "));
        }
        "get" => {
            let name = rest.join(" ");
            let name = name.trim();
            if name.is_empty() {
                fail("get needs a skill name, e.g. get agent.3md sql-query");
            }
            let (_doc, skills) = load(&file);
            match get(&skills, name) {
                None => fail(&format!("no such skill: {name}")),
                Some(s) => {
                    let cost = s.cost.as_ref().map(|c| format!(", cost={c}")).unwrap_or_default();
                    let inputs = if s.inputs.is_empty() { String::new() } else { format!(", inputs={}", s.inputs.join("/")) };
                    println!("# {}  (z={}{}{})", s.name, s.z, cost, inputs);
                    println!("{}", s.body);
                }
            }
        }
        "resolve" => {
            let name = rest.join(" ");
            let name = name.trim();
            if name.is_empty() {
                fail("resolve needs a skill name, e.g. resolve agent.3md web-research");
            }
            let (_doc, skills) = load(&file);
            if get(&skills, name).is_none() {
                fail(&format!("no such skill: {name}"));
            }
            let chain = resolve(&skills, name);
            println!("{name} loads {} plane(s):", chain.len());
            for s in &chain {
                let deps = if s.deps.is_empty() { String::new() } else { format!("  (-> {})", s.deps.iter().map(|d| d.to_string()).collect::<Vec<_>>().join(",")) };
                println!("  - {}{}", s.name, deps);
            }
        }
        "validate" => {
            let src = match std::fs::read_to_string(&file) {
                Ok(s) => s,
                Err(_) => { eprintln!("cannot read {file}"); exit(2); }
            };
            let doc = match parse(&src) {
                Ok(d) => d,
                Err(e) => {
                    println!("agent3md validate: {file}\n  x [parse]  not valid 3md: {e:?}\n  FAIL");
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
            println!("  {} — {} error(s), {} warning(s)", if ok { "PASS" } else { "FAIL" }, errors.len(), warnings.len());
            exit(if ok { 0 } else { 1 });
        }
        other => fail(&format!("unknown command: {other}")),
    }
}
