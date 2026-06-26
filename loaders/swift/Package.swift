// swift-tools-version: 6.0
import PackageDescription

// A Swift loader for agent.3md, proving the agent3md/1 standard is portable:
// it depends on the canonical ThreeMD package and mirrors the TS reference
// loader's contract (manifest / route / get / resolve).
let package = Package(
    name: "agent3md-swift",
    dependencies: [
        .package(name: "3md", path: "../../../3md"),
    ],
    targets: [
        .executableTarget(
            name: "Agent3MD",
            dependencies: [.product(name: "ThreeMD", package: "3md")],
            path: "Sources/Agent3MD"
        ),
    ]
)
