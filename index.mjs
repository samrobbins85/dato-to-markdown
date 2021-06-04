import dotenv from "dotenv";
import fetch from "node-fetch";
import { render, renderRule } from "datocms-structured-text-to-html-string";
import { isCode } from "datocms-structured-text-utils";
import rehype from "rehype";
import rehype2remark from "rehype-remark";
import stringify from "remark-stringify";
import fs from "fs";
import inquirer from "inquirer";
import pluralize from "pluralize";
import capitalize from "capitalize";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
async function fetchAPI(query, { variables } = {}) {
  const res = await fetch("https://graphql.datocms.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DATO}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  const json = await res.json();

  if (json.errors) {
    console.error(json.errors);
    throw new Error("Failed to fetch API");
  }

  return json.data;
}

async function getAllBlogs(model, title, structuredtext) {
  const data = await fetchAPI(`
    {
      all${capitalize(pluralize(model))} {
        ${title}
        ${structuredtext}{
          value
        }        
      }
    }
    `);
  return data[`all${capitalize(pluralize(model))}`];
}

async function stToMD(structuredtext) {
  const content = render(structuredtext, {
    customRules: [
      renderRule(isCode, ({ adapter: { renderNode, renderText }, key, node }) =>
        renderNode(
          "pre",
          { key, class: `language-${node.language}` },
          renderNode(
            "code",
            { key, class: `language-${node.language}` },
            renderText(node.code)
          )
        )
      ),
    ],
  });
  const markdown = await rehype()
    .use(rehype2remark)
    .use(stringify)
    .process(content);

  return String(markdown);
}

inquirer
  .prompt([
    {
      type: "input",
      name: "model",
      message: "Which model do you want to query?",
    },
    {
      type: "input",
      name: "title",
      message: "What's the name of the field you want to use as file names?",
    },
    {
      type: "input",
      name: "structuredtext",
      message: "Which field contains the structured text?",
    },
  ])
  .then(async function (answers) {
    const blogs = await getAllBlogs(
      answers.model,
      answers.title,
      answers.structuredtext
    );

    for (const page in blogs) {
      const md = await stToMD(blogs[page].structuredtext);
      fs.writeFile(
        `${process.cwd()}/blogs/${blogs[page].slug}.md`,
        md,
        { flag: "w+" },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
        }
      );
    }
  });
