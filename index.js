#!/usr/bin/env node
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
import ora from "ora";
async function fetchAPI(token, query, { variables } = {}) {
  const res = await fetch("https://graphql.datocms.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  }).catch((e) => console.log(e));
  if (!res.ok) {
    throw new Error("Failed to fetch API");
  }
  const json = await res.json().catch((e) => console.log(e));

  return json.data;
}

async function getAllBlogs(token, model, title, structuredtext) {
  const data = await fetchAPI(
    token,
    `
    {
      all${capitalize(pluralize(model))} {
        ${title}
        ${structuredtext}{
          value
        }        
      }
    }
    `
  ).catch((e) => console.log(e));
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
      name: "token",
      message: "What's your API Token?",
    },
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
    {
      type: "confirm",
      name: "folder",
      message: "Do you want the files to be put in a folder?",
    },
    {
      type: "input",
      name: "folder_name",
      message: "Okay! What name do you want the folder to have?",
      when(answers) {
        return answers.folder;
      },
    },
  ])
  .then(async function (answers) {
    const fetching = ora("Fetching data").start();
    const blogs = await getAllBlogs(
      answers.token,
      answers.model,
      answers.title,
      answers.structuredtext
    ).catch((e) => {
      fetching.fail();
      throw new Error("Couldn't get blog content");
    });
    fetching.succeed();

    if (answers.folder && !fs.existsSync(`./${answers.folder_name}`)) {
      fs.mkdirSync(`./${answers.folder_name}`);
    }
    const converting = ora("Converting to markdown").start();
    for (const page in blogs) {
      const md = await stToMD(blogs[page].structuredtext).catch((e) =>
        console.log(e)
      );
      fs.writeFile(
        `${process.cwd()}/${answers.folder ? `${answers.folder_name}/` : ""}${
          blogs[page].slug
        }.md`,
        md,
        { flag: "w+" },
        (err) => {
          if (err) {
            console.error(err);
            converting.fail();
            return;
          }
        }
      );
    }
    converting.succeed();
  })
  .catch((e) => {
    console.log(e);
  });
