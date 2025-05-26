```shell
printf '%b\n' 'if len(array) <= 1 {\n\t\treturn\n\t}\n\t'
```

```shell
echo 'if len(array) <= 1 {\n\t\treturn\n\t}\n\t'
```

```text

if len(array) <= 1 {
		return
	}
	%
```

```text
%b expands all backslash escape sequences not just \t or \n. For example it will also expand \f (form feed) or \r (carriage return). Check help printf or help echo for more details.
```