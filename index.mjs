import dotenv from "dotenv";
import fetch from "node-fetch";
import { render, renderRule } from "datocms-structured-text-to-html-string";
import { isCode } from "datocms-structured-text-utils";
import rehype from "rehype";
import rehype2remark from "rehype-remark";
import stringify from "remark-stringify";
import fs from "fs";
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

async function getAllBlogs() {
  const data = await fetchAPI(`
    {
      allArticles(orderBy: date_DESC) {
        slug
        structuredtext{
          value
        }        
      }
    }
    `);
  return data.allArticles;
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

const blogs = await getAllBlogs();

for (const page in blogs) {
  const md = await stToMD(blogs[page].structuredtext);
  console.log(md);
  fs.writeFile(
    `${process.cwd()}/blogs/${blogs[page].slug}.md`,
    md,
    { flag: "w+" },
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      //file written successfully
    }
  );
}
