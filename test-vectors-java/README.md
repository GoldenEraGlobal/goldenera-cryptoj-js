# Test Vectors Generator

This is an optional manual generator for the legacy transaction compatibility vectors. Normal
JavaScript tests use committed deterministic vectors and do not invoke Maven or access the network.

## Prerequisites

- Java 21+
- Maven 3.8+
- Access to GoldenEra Maven repository (GitHub Packages)

## Setup

Configure your `~/.m2/settings.xml` with GitHub Packages credentials:

```xml
<settings>
  <servers>
    <server>
      <id>github</id>
      <username>YOUR_GITHUB_USERNAME</username>
      <password>YOUR_GITHUB_TOKEN</password>
    </server>
  </servers>
</settings>
```

## Generate Test Vectors

```bash
cd test-vectors-java
mvn compile exec:java > ../src/__tests__/testVectors.generated.ts
```

## Update TypeScript Tests

Review the diff in `src/__tests__/testVectors.generated.ts` before accepting regenerated vectors.
The mining-economics vectors are maintained separately in
`src/__tests__/miningEconomics.java-vectors.ts` from the authoritative sibling Java implementation.
