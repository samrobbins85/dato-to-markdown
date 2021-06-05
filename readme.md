# DatoCMS Structured Text to Markdown

Convert Structured Text from DatoCMS to Markdown

## Usage

```
npx dato-to-markdown
```

### API Token

The API token can be found by going into your project, selecting **Settings** in the top bar, then **API tokens** in the sidebar. This project only needs the **Read-only API token**

### Model

In the **content** tab, selecting the model you want from the sidebar, you can see the name of the model in monospace font at the top. Common examples will be “blog” or “article”.

### Field to use for file names

Your model will have many fields, and this program allows you to choose which one you want to use for file names. The most common example will be the **slug**, as this doesn't contain any spaces and should describe the file.

### Field that contains structured text

Finally, there is the field that contains structured text, you might have named this something like _content_, you can check this by going into a document, and hovering the text above the structured text field. The name of the field will appear in monospace at the top right of the structured text field.

### Putting the files in a folder

It might be convenient for you to put the created files in a folder, instead of just putting them in the current working directory, you can specify this here.

## Acknowledgements

- [rehype](https://github.com/rehypejs/rehype)
- [structured-text](https://github.com/datocms/structured-text)
- [inquirer.js](https://github.com/SBoudrias/Inquirer.js/)
- [ora](https://github.com/sindresorhus/ora)
