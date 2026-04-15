# WenYan Feature Parity TODO

The following features were identified as competitive advantages of the Wenyan desktop application and are scheduled for future implementation in Octopus MD:

## 1. Front-Matter Metadata Parsing
- **Description**: Add native AST/parser support to recognize YAML front-matter blocks at the top of the markdown document (e.g., `--- \n title: xxx \n ---`).
- **Goal**: Enable the editor to strip the raw front-matter from the rendered preview while mapping the metadata (Title, Author, Tags) to global state variables.

## 2. Typora Custom Theme Ecosystem Compatibility
- **Description**: Implement a dynamic CSS loader that is strictly compliant with standard Typora CSS theme variables. 
- **Goal**: Allow users to import external `.css` files (such as Rainbow, Lapis, Pie) and seamlessly override the built-in Vue component scoping to achieve thousands of different styling aesthetics.
