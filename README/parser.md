
# QuCPL Parser Documentation

## What is Parsing?

**Parsing** is the process of analyzing a sequence of symbols (in this case, code written in the QuCPL language) according to the rules of a formal grammar. It converts source code into a structured format, usually a **syntax tree** or **abstract syntax tree (AST)**, which represents the code's structure in a machine-readable way.

In simpler terms, it's like reading a sentence and breaking it into subject, verb, and object so a computer can understand what’s going on.

---

## 🧠 What This Parser Does

This Python script uses the `Lark` parsing library to parse a custom quantum programming language called **QuCPL**.

### Main Features of the Code

- ✅ **Grammar Loading**:

  ```python
  with open("grammar3.lark") as f:
      grammar = f.read()
  ```

  Loads the grammar rules from a `.lark` file, which defines the syntax of QuCPL.

- ✅ **Lark Parser Creation**:

  ```python
  parser = Lark(grammar, parser='lalr', start='start')
  ```

  Initializes a parser with the specified grammar using the LALR parsing algorithm.

- ✅ **Transformer (ASTBuilder)**:

  This class walks through the parse tree and converts it into a more useful **Abstract Syntax Tree (AST)**. Each method corresponds to a grammar rule.
  For example:
  - `qubit_decl` builds qubit declarations.
  - `qop_stmt` handles quantum gate operations.
  - `if_stmt` builds conditional branches.

- ✅ **JSON Output**:
  After parsing, the AST is saved as a `.json` file:

  ```python
  with open("ast.json", "w") as f:
      json.dump(ast, f, indent=2)
  ```

- ✅ **Input Handling**:
  The program reads QuCPL code from the user input until a blank line is entered.

---

## Output

The parser creates a JSON file called `ast.json` which stores the structured form (AST) of the source code.

---

## Technologies Used

- Python 3
- Lark
- JSON - For saving the output AST.

---

## Example Use Case

```bash
$ python parse_qucpl.py
Enter your QuCPL code (end with a blank line):
qubit q0, q1;
qop h q0;
qop cx q0, q1;
measure q0, q1 -> c0, c1;
```

➡ This input is parsed and converted into a structured `ast.json` file.

---

## 🧩 Summary

This script is a crucial component for converting high-level QuCPL code into a format that a compiler or interpreter can use. It lays the foundation for building quantum simulators or compilers by first understanding the code's structure.
