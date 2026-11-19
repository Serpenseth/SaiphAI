export const WhitelistCmds = new Set([
  // Javascript/Typescript
  'npm init', 'yarn init', 'npm install',
  'npm uninstallt', 'npx', 'npm run',
  // Python
  'python3', 'pip', 'python', 'py',
  'pip install -r requirements.txt', 'pyinstaller', 'pynsist',
  // Rust
  'cargo new', 'cargo build',
  'cargo run', 'dx serve', 'dx build',
  // Go
  'go mod init', 'go mod tidy', 'go build', 'go run',
  // Java
  'javac', 'java', 'jar',
  // C#
  'aspnet', 'blazegenerator',
  // C++
  'g++', 'make', 'ninja', 'vcpkg install',
  'clang++', 'conan install',
  //
  'echo'
]);
