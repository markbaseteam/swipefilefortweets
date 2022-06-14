import cytoscape from "cytoscape";
import dirTree from "directory-tree";
import fs from "fs";
import matter from "gray-matter";
import Markdown from "marked-react";
import { GetStaticPaths, GetStaticProps } from "next";
import { NextSeo } from "next-seo";
import dynamic from "next/dynamic";
import Link from "next/link";
import path from "path";
import React, { ReactElement, useEffect, useState } from "react";
import useSWR from "swr";
import { classNames } from "../utils/misc";
import { Post, PostMetadata } from "../utils/types";
const MarkdownIt = require("markdown-it"),
  md = new MarkdownIt();

const Graph = dynamic(() => import("../components/Graph"), {
  ssr: false,
});

const FilePage = (props: { post: Post }) => {
  const [graphPosts, setGraphPosts] = useState<Post[]>([]);
  const [currentPost, setCurrentPost] = useState<Post>();
  const [graphElements, setGraphElements] = useState<
    cytoscape.ElementDefinition[]
  >([]);
  const [showInlineLinkPopover, setShowInlineLinkPopover] =
    useState<string>("");

  // Render links
  const renderer = {
    link(href: string, text: string) {
      if (href.endsWith(".md")) {
        let linkedPostContent = "";
        let mdPath = href;

        if (typeof window !== "undefined" && graphPosts.length > 0) {
          // Client-side-only code
          mdPath = new URL(href, window.location.href).href
            .replace(window.location.origin + "/", "")
            .replace(".md", "");
          const linkedPost = graphPosts.filter((p) => p.url === mdPath);
          if (linkedPost.length > 0) {
            linkedPostContent = linkedPost[0].content;
          }
        }

        return (
          <span key={href}>
            <Link href={mdPath}>
              <a
                onMouseOver={() => setShowInlineLinkPopover(mdPath)}
                onMouseOut={() => setShowInlineLinkPopover("")}
                className="px-0.5 mx-0.5 mr-1 rounded-sm bg-indigo-200 hover:bg-indigo-300 text-gray-800 hover:text-gray-600 opacity-70 no-underline"
              >
                {text[0]}
              </a>
            </Link>
            <span
              className={classNames(
                "linkPopup",
                showInlineLinkPopover === mdPath && linkedPostContent
                  ? ""
                  : "hidden"
              )}
              dangerouslySetInnerHTML={{
                __html: md.render(linkedPostContent),
              }}
            ></span>
          </span>
        );
      } else {
        return (
          <Link key={href} href={href}>
            <a className="text-indigo-400 hover:text-indigo-500 no-underline">
              {text[0]}
            </a>
          </Link>
        );
      }
    },
    table(children: any) {
      return (
        <div className="not-prose relative shadow-md rounded-sm sm:rounded-lg overflow-x-scroll max-w-full scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-neutral-800">
          <table className="table">
            {children[0]}
            {children[1]}
          </table>
        </div>
      ) as ReactElement;
    },
    paragraph(text: string) {
      return (
        <div
          style={{
            display: "block",
            marginTop: "1em",
            marginBottom: "1em",
            marginLeft: 0,
            marginRight: 0,
          }}
        >
          {text}
        </div>
      );
    },
    html(html: string) {
      return <div dangerouslySetInnerHTML={{ __html: html }}></div>;
    },
    // blockquote(quote: ReactElement[]) {
    //   const quoteText: string =
    //     quote[0].props.children[0].props.dangerouslySetInnerHTML.__html;
    //   const re = /\[!([^\s#]+)\]/g;
    //   const match = re.exec(quoteText);
    //   const filteredQuoteText = quoteText.replace(re, "");

    //   if (match && match.length > 0) {
    //     const callout = match[1];
    //     console.log("callout - ", callout);
    //     switch (callout) {
    //       case "INFO":
    //         return (
    //           <div role="alert" className="my-3">
    //             <div className="flex items-center bg-blue-500 text-white text-sm font-bold px-4 py-3 rounded-t">
    //               Info
    //             </div>
    //             <div className="rounded-b bg-black px-4 py-3 text-white">
    //               <p className="whitespace-pre-wrap">{filteredQuoteText}</p>
    //             </div>
    //           </div>
    //         );
    //       default:
    //         break;
    //     }
    //   }
    //   console.log("quoteText - ", quoteText);
    //   return quote;
    // },
    text(text: string) {
      const formattedText = text.replace(
        /==([^=]+)==/g,
        `<span class="highlight">$1</span>`
      );
      return (
        <span
          key={text.substring(0, 20)}
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    },
  };

  const [postContent, setPostContent] = useState<string>(props.post.content);

  const [showBacklinkPopover, setShowBacklinkPopover] = useState<string>("");

  const getGraphElements = (currentPost: Post) => {
    const elements = [] as cytoscape.ElementDefinition[];

    elements.push({
      data: {
        id: currentPost.url,
        label: currentPost.title,
      },
      selected: true,
    });

    for (const backlinkedPostUrl of currentPost.backlinks) {
      // Get backlinked post from graph posts
      const backlinkedPosts = graphPosts.filter((p) => {
        return p.url === backlinkedPostUrl;
      });

      if (backlinkedPosts.length > 0) {
        elements.push({
          data: {
            id: backlinkedPosts[0].url,
            label: decodeURIComponent(
              backlinkedPosts[0].url.split("/").pop() ?? ""
            ),
          },
        });
        elements.push({
          data: {
            source: backlinkedPosts[0].url,
            target: currentPost.url,
          },
        });

        for (const l2link of backlinkedPosts[0].links) {
          elements.push({
            data: {
              id: l2link,
              label: decodeURIComponent(l2link.split("/").pop() ?? ""),
            },
          });
          elements.push({
            data: { source: l2link, target: backlinkedPosts[0].url },
          });
        }

        for (const l2backlink of backlinkedPosts[0].backlinks) {
          elements.push({
            data: {
              id: l2backlink,
              label: decodeURIComponent(l2backlink.split("/").pop() ?? ""),
            },
          });
          elements.push({
            data: { source: l2backlink, target: backlinkedPosts[0].url },
          });
        }
      }
    }

    for (const linkedPostUrl of currentPost.links) {
      // Get linked post from graph posts
      const linkedPosts = graphPosts.filter((p) => {
        return p.url === linkedPostUrl;
      });

      if (linkedPosts.length > 0) {
        elements.push({
          data: {
            id: linkedPosts[0].url,
            label: decodeURIComponent(
              linkedPosts[0].url.split("/").pop() ?? ""
            ),
          },
        });
        elements.push({
          data: { source: linkedPosts[0].url, target: currentPost.url },
        });

        for (const l2link of linkedPosts[0].links) {
          elements.push({
            data: {
              id: l2link,
              label: decodeURIComponent(l2link.split("/").pop() ?? ""),
            },
          });
          elements.push({
            data: { source: l2link, target: linkedPosts[0].url },
          });
        }

        for (const l2backlink of linkedPosts[0].backlinks) {
          elements.push({
            data: {
              id: l2backlink,
              label: decodeURIComponent(l2backlink.split("/").pop() ?? ""),
            },
          });
          elements.push({
            data: { source: l2backlink, target: linkedPosts[0].url },
          });
        }
      }
    }

    setGraphElements(elements);
  };

  const fetcher = (endpoint: string) =>
    fetch(endpoint).then((res) => res.json());

  const { data, isValidating, mutate, error } = useSWR(
    "/api/content-graph",
    fetcher
  );

  useEffect(() => {
    setPostContent(props.post.content);
    if (
      !sessionStorage.getItem("graph") ||
      sessionStorage.getItem("graph") === "[]"
    ) {
      mutate();
    } else {
      const graphData = JSON.parse(sessionStorage.getItem("graph") ?? "[]");
      setGraphPosts(graphData);

      // Get current post from graph posts
      const currentPosts = graphData.filter((p: Post) => {
        return p.url === props.post.url;
      });

      if (currentPosts.length > 0) {
        setCurrentPost(currentPosts[0]);
      }
    }
  }, [props]);

  useEffect(() => {
    if (data && !error) {
      sessionStorage.setItem("graph", JSON.stringify(data.graph));
      setGraphPosts(data.graph);

      // Get current post from graph posts
      const currentPosts = data.graph.filter((p: Post) => {
        return p.url === props.post.url;
      });

      if (currentPosts.length > 0) {
        setCurrentPost(currentPosts[0]);
      }
    }
  }, [data]);

  useEffect(() => {
    if (currentPost) {
      getGraphElements(currentPost);
    } else {
      setGraphElements([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPost]);

  useEffect(() => {
    setGraphPosts(JSON.parse(sessionStorage.getItem("graph") ?? "[]"));
  }, []);

  return (
    <div>
      <NextSeo
        title={
          (props.post.metadata?.title ?? props.post.title) +
          " - " +
          process.env.NEXT_PUBLIC_PROJECT_NAME
        }
        description={
          props.post.metadata?.description ??
          props.post.content.substring(0, 280)
        }
        canonical={props.post.metadata?.canonical}
        openGraph={{
          url: props.post.metadata?.ogUrl,
          title: props.post.metadata?.ogTitle,
          description: props.post.metadata?.ogDescription,
          images: [{ url: props.post.metadata?.ogImage ?? "" }],
          site_name: props.post.metadata?.ogSitename,
        }}
        twitter={{
          handle: props.post.metadata?.twitterHandle,
          site: props.post.metadata?.twitterSite,
          cardType: props.post.metadata?.twitterCardType,
        }}
      />
      <div className="prose sm:prose-md dark:prose-invert dark:text-gray-300">
        {postContent === "" && (
          <div>
            <h1>{props.post.title}</h1>
          </div>
        )}
        <div></div>
        <Markdown value={postContent} renderer={renderer} />
      </div>
      <div className="w-full">
        {!isValidating &&
          (graphElements.length > 1 ||
            (currentPost && currentPost.backlinks.length > 0)) && (
            <div>
              <hr className="my-12 w-1/3 border dark:border-neutral-600 border-neutral-200" />
              <div>
                {currentPost && currentPost.backlinks.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold mb-4 dark:text-white text-black">
                      Backlinks
                    </h3>
                    <div>
                      {currentPost.backlinks.map((link, i) => {
                        let linkedPostContent = "";
                        if (
                          typeof window !== "undefined" &&
                          graphPosts.length > 0
                        ) {
                          // Client-side-only code
                          const linkedPost = graphPosts.filter(
                            (p) => p.url === link
                          );
                          if (linkedPost.length > 0) {
                            linkedPostContent = linkedPost[0].content;
                          }
                        }

                        return (
                          <div key={i}>
                            <Link href={link}>
                              <a
                                onMouseOver={() => setShowBacklinkPopover(link)}
                                onMouseOut={() => setShowBacklinkPopover("")}
                                className="px-1 my-1 rounded-sm bg-indigo-200 hover:bg-indigo-300 text-gray-800 hover:text-gray-600 opacity-70"
                              >
                                {link.split("/").length > 0 &&
                                  decodeURIComponent(
                                    link.split("/").pop() ?? ""
                                  )}
                              </a>
                            </Link>
                            <span
                              className={classNames(
                                "prose sm:prose-md dark:prose-invert dark:text-gray-300 linkPopup",
                                showBacklinkPopover === link &&
                                  linkedPostContent
                                  ? ""
                                  : "hidden"
                              )}
                              dangerouslySetInnerHTML={{
                                __html: md.render(linkedPostContent),
                              }}
                            ></span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {graphElements.length > 1 && (
                  <>
                    <h3 className="text-xl font-bold my-4 dark:text-white text-black">
                      Graph
                    </h3>
                    <div className="border-2 rounded-md dark:border-neutral-600 border-neutral-200 w-full h-64 mt-4">
                      <Graph elements={graphElements} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  let filePaths = getNavigationPaths();

  filePaths = filePaths?.map((filePath) => {
    return {
      params: {
        filePath: filePath.params.filePath[0].split("/"),
      },
    };
  });

  return {
    paths: filePaths ?? [],
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  if (context.params?.filePath) {
    return {
      props: {
        post: getPost((context.params?.filePath as string[]).join("/")),
      },
    };
  } else {
    return {
      props: {
        post: null,
      },
    };
  }
};

export default FilePage;

// Internal functions
const getPost = (postPath: string) => {
  const resolvedPath = "content/" + postPath + ".md";

  try {
    const mdFile = fs.readFileSync(path.resolve(resolvedPath), "utf-8");

    try {
      const md = matter(mdFile, {});

      const metadata = {
        title: md.data.hasOwnProperty("title")
          ? md.data.title
          : postPath.split("/")[postPath.split("/").length - 1],
        description: md.data.hasOwnProperty("description")
          ? md.data.description
          : md.content.substring(0, 280),
      } as PostMetadata;

      if (md.data.hasOwnProperty("canonical")) {
        metadata.canonical = md.data.canonical;
      }

      if (md.data.hasOwnProperty("ogUrl")) {
        metadata.ogUrl = md.data.ogUrl;
      }

      if (md.data.hasOwnProperty("ogTitle")) {
        metadata.ogTitle = md.data.ogTitle;
      }

      if (md.data.hasOwnProperty("ogDescription")) {
        metadata.ogDescription = md.data.ogDescription;
      }

      if (md.data.hasOwnProperty("ogImage")) {
        metadata.ogImage = md.data.ogImage;
      }

      if (md.data.hasOwnProperty("ogSitename")) {
        metadata.ogSitename = md.data.ogSitename;
      }

      if (md.data.hasOwnProperty("twitterHandle")) {
        metadata.twitterHandle = md.data.twitterHandle;
      }

      if (md.data.hasOwnProperty("twitterSite")) {
        metadata.twitterSite = md.data.twitterSite;
      }

      if (md.data.hasOwnProperty("twitterCardType")) {
        metadata.twitterCardType = md.data.twitterCardType;
      }

      return {
        url: postPath,
        title: postPath.split("/")[postPath.split("/").length - 1],
        content: md.content,
        links: [],
        backlinks: [],
        metadata: metadata,
      } as Post;
    } catch (error) {
      console.error("Error occurred in getPost - ", error);
      return {
        url: postPath,
        title: postPath.split("/")[postPath.split("/").length - 1],
        content: mdFile,
        links: [],
        backlinks: [],
        metadata: {
          title: postPath.split("/")[postPath.split("/").length - 1],
          description: mdFile.substring(0, 280),
        },
      } as Post;
    }
  } catch (error) {
    return null;
  }
};

const getNavigationPaths = () => {
  const directoryTree = dirTree("content", { extensions: /\.md/ });

  return directoryTree.children?.flatMap((item) => {
    if (item.hasOwnProperty("children")) {
      // Iterate on it with child function
      return getNavigationChildrenPaths(item, "", 0);
    } else {
      return {
        params: {
          filePath: [item.name.replace(".md", "")],
        },
      };
    }
  });
};

const getNavigationChildrenPaths = (
  item: dirTree.DirectoryTree,
  filePath: string,
  depth: number
):
  | {
      params: {
        filePath: string[];
      };
    }
  | {
      params: {
        filePath: string[];
      };
    }[] => {
  if (item.children) {
    return item.children.flatMap((child) => {
      return getNavigationChildrenPaths(
        child,
        filePath
          ? filePath + "/" + item.name.replace(".md", "")
          : item.name.replace(".md", ""),
        depth + 1
      );
    });
  } else {
    return {
      params: {
        filePath: [
          filePath
            ? filePath + "/" + item.name.replace(".md", "")
            : item.name.replace(".md", ""),
        ],
      },
    };
  }
};
