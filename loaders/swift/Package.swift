// swift-tools-version: 6.0
import PackageDescription

// A Swift loader for agent.3md, proving the agent3md/1 standard is portable.
// Depends on the canonical ThreeMD package straight from GitHub (no sibling
// checkout needed) and mirrors the TS reference loader's contract.
let package = Package(
    name: "agent3md-swift",
    products: [
        .library(name: "Agent3MD", targets: ["Agent3MD"]),
    ],
    dependencies: [
        .package(url: "https://github.com/CorvidLabs/3md.git", from: "1.7.17"),
    ],
    targets: [
        .target(
            name: "Agent3MD",
            dependencies: [.product(name: "ThreeMD", package: "3md")],
            path: "Sources/Agent3MD"
        ),
        .executableTarget(
            name: "Agent3MDCLI",
            dependencies: ["Agent3MD"],
            path: "Sources/Agent3MDCLI"
        ),
        .testTarget(
            name: "Agent3MDTests",
            dependencies: ["Agent3MD"],
            path: "Tests/Agent3MDTests"
        ),
    ]
)
