import XCTest
import Agent3MD

final class Agent3MDTests: XCTestCase {
    
    func testRealAgent3MD() throws {
        let path = "../../agent.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        XCTAssertEqual(agent.name, "dev")
        XCTAssertEqual(agent.tools, ["rg", "fd", "jq", "git", "gh", "curl"])
        XCTAssertEqual(agent.skills.count, 7)
        
        let search = try XCTUnwrap(agent.get("search"))
        XCTAssertEqual(search.name, "search")
        XCTAssertEqual(search.z, 1)
        XCTAssertEqual(search.triggers, ["search", "find", "grep", "code", "pattern"])
        XCTAssertEqual(search.inputs, ["pattern", "path"])
        XCTAssertEqual(search.tool, "rg --line-number {pattern} {path}")
    }
    
    func testValidMinimal() throws {
        let path = "../../examples/conformance/valid-minimal.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        XCTAssertEqual(agent.name, "Min")
    }
    
    func testValidDeps() throws {
        let path = "../../examples/conformance/valid-deps.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        let resolved = agent.resolve("answer")
        XCTAssertEqual(resolved.count, 2)
        XCTAssertEqual(resolved[0].name, "answer")
        XCTAssertEqual(resolved[1].name, "cite")
    }
    
    func testValidCost() throws {
        let path = "../../examples/conformance/valid-cost.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        let search = try XCTUnwrap(agent.get("search"))
        XCTAssertEqual(search.cost, "net")
    }
    
    func testValidEntry() throws {
        let path = "../../examples/conformance/valid-entry.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        XCTAssertEqual(agent.name, "Entry")
    }
    
    func testValidFallbackIdentity() throws {
        let path = "../../examples/conformance/valid-fallback-identity.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        XCTAssertEqual(agent.name, "Fallback")
    }
    
    func testValidTypedInputs() throws {
        let path = "../../examples/conformance/valid-typed-inputs.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        let query = try XCTUnwrap(agent.get("query"))
        XCTAssertEqual(query.inputSchema.count, 2)
        XCTAssertEqual(query.inputSchema[0].name, "question")
        XCTAssertEqual(query.inputSchema[0].type, "string")
        XCTAssertTrue(query.inputSchema[0].required)
        XCTAssertEqual(query.inputSchema[1].name, "limit")
        XCTAssertEqual(query.inputSchema[1].type, "number")
        XCTAssertFalse(query.inputSchema[1].required)
    }
    
    func testValidCommand() throws {
        let path = "../../examples/conformance/valid-command.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        let cmd = agent.command("search", ["pattern": "TODO", "path": "src"])
        XCTAssertEqual(cmd, "rg --line-number 'TODO' 'src'")
    }
    
    func testRouting() throws {
        let path = "../../agent.3md"
        let src = try String(contentsOfFile: path, encoding: .utf8)
        let agent = try Agent(source: src)
        let routed = agent.route("find every TODO in the source code")
        XCTAssertFalse(routed.isEmpty)
        let top = try XCTUnwrap(routed.first)
        XCTAssertEqual(top.skill.name, "search")
    }
}
