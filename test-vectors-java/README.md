# Test Vectors Generator

This is a lightweight Java project that uses the published `goldenera-cryptoj` library to generate test vectors for the TypeScript implementation.

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

After generating new vectors, update `src/__tests__/testVectors.ts` with the generated content.
