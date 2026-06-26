// Reference agent.3md loader in Rust, built on the canonical `threemd` parser.
// Mirrors the TypeScript runtime (manifest / route / get / resolve) to show the
// agent3md/1 standard is genuinely cross-language: one agent file, many loaders.
use std::collections::{BTreeMap, BTreeSet};
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

fn build_skills(doc: &Document) -> Vec<Skill> {
    let mut skills = Vec::new();
    for p in &doc.planes {
        if p.attributes.get("kind").map(String::as_str) == Some("identity") {
            continue;
        }
        let z = p.z as i64;
        skills.push(Skill {
            z,
            name: p.label.clone().unwrap_or_else(|| format!("skill-{z}")),
            triggers: csv(p.attributes.get("triggers")),
            inputs: csv(p.attributes.get("inputs")),
            cost: p.attributes.get("cost").cloned(),
            deps: parse_deps(&p.body),
            body: p.body.clone(),
        });
    }
    skills
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
        let mut hits = BTreeSet::new();
        for w in &req {
            if tw.contains(w) {
                hits.insert(w.clone());
            }
        }
        if !hits.is_empty() {
            scored.push((s, hits.into_iter().collect()));
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

fn main() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../agent.3md");
    let src = std::fs::read_to_string(path).expect("read agent.3md");
    let doc: Document = parse(&src).expect("parse agent.3md");
    let skills = build_skills(&doc);

    println!("=== MANIFEST (Rust loader) ===");
    let name = doc.title.clone().or_else(|| doc.metadata.get("agent").cloned()).unwrap_or_default();
    let model = doc.metadata.get("model").cloned().unwrap_or_default();
    let tools = doc.metadata.get("tools").cloned().unwrap_or_default();
    println!("  agent: {name}");
    println!("  model: {model}");
    println!("  tools: {tools}");
    println!("  skills ({}): {}", skills.len(),
        skills.iter().map(|s| s.name.as_str()).collect::<Vec<_>>().join(", "));

    println!("\n=== ROUTE \"review my diff before the PR\" ===");
    let ranked = route(&skills, "review my diff before the PR");
    if let Some((top, hits)) = ranked.first() {
        println!("  -> {}  (matched: {})", top.name, hits.join(", "));
        let chain = resolve(&skills, &top.name);
        println!("  loads: {}", chain.iter().map(|s| s.name.as_str()).collect::<Vec<_>>().join(" + "));
    }

    println!("\n=== GET \"sql-query\" (first 4 lines) ===");
    if let Some(s) = get(&skills, "sql-query") {
        println!("  inputs={:?} cost={:?}", s.inputs, s.cost);
        for line in s.body.lines().take(4) {
            println!("    {line}");
        }
    }
}
