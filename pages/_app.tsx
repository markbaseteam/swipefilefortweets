import { Dialog, Transition } from "@headlessui/react";
import { MenuIcon, XIcon } from "@heroicons/react/outline";
import { SearchIcon } from "@heroicons/react/solid";
import dirTree from "directory-tree";
import fs from "fs";
import matter from "gray-matter";
import lunr from "lunr";
import { NextSeo } from "next-seo";
import { ThemeProvider, useTheme } from "next-themes";
import type { AppContext, AppProps } from "next/app";
import App from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";
import path, { resolve } from "path";
import { Fragment, MouseEvent, useEffect, useState } from "react";
import recursive from "recursive-readdir";
import "../assets/styles/output.css";
import { ThemeChanger } from "../components/ThemeChanger";
import MarkbaseFavicon from "../public/favicon-512x512.png";
import { ignoredFolders } from "../utils/misc";
import { SearchableDocument } from "../utils/types";
const removeMd = require("remove-markdown");

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<lunr.Index.Result[]>([]);
  const searchIndex = lunr(function () {
    this.ref("url");
    this.field("name");
    this.field("content");

    for (const document of pageProps.documentList) {
      this.add(document);
    }
  });

  const toggleCollapseFolder = (
    event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>
  ) => {
    if (openFolders.filter((f) => f === event.currentTarget.id).length === 0) {
      // Open folder
      setOpenFolders([...openFolders, event.currentTarget.id]);
    } else {
      // Collapse folder
      setOpenFolders(openFolders.filter((f) => f !== event.currentTarget.id));
    }
  };

  const getNavigation = (left?: boolean) => {
    return pageProps.directoryTree.children.map(
      (item: dirTree.DirectoryTree) => {
        if (
          item.children &&
          item.children.length > 0 &&
          !ignoredFolders.includes(item.name)
        ) {
          // Iterate on it with child function
          return getNavigationChildren(item, "", 0, left);
        } else if (!item.children) {
          return (
            <Link key={item.path} href={`/${item.name.replace(".md", "")}`}>
              <a
                onClick={() => setSidebarOpen(false)}
                className={classNames(
                  "text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white",
                  "group flex items-center py-2 text-base",
                  left ? "mr-auto" : "ml-auto"
                )}
              >
                <span className={left ? "mr-auto" : "ml-auto"}>
                  {item.name.replace(".md", "")}
                </span>
              </a>
            </Link>
          );
        }
      }
    );
  };

  const getNavigationChildren = (
    item: dirTree.DirectoryTree,
    path: string,
    depth: number,
    left?: boolean
  ): JSX.Element | undefined => {
    if (
      item.children &&
      item.children.length > 0 &&
      !ignoredFolders.includes(item.name)
    ) {
      return (
        <div key={item.name} className="">
          <div
            id={item.path}
            onClick={toggleCollapseFolder}
            style={
              left
                ? {
                    marginLeft: `${depth}rem`,
                  }
                : {
                    marginRight: `${depth}rem`,
                  }
            }
            className={classNames(
              "cursor-pointer text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white",
              `group flex items-center py-2 text-base font-bold`
            )}
          >
            <a className={classNames("flex", left ? "mr-auto" : "ml-auto")}>
              {left && (
                <span className="inset-y-0 left-0 flex items-center">
                  {openFolders.filter((f) => f === item.path).length === 0 ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 arrow"
                      viewBox="0 0 256 512"
                    >
                      <path d="M118.6 105.4l128 127.1C252.9 239.6 256 247.8 256 255.1s-3.125 16.38-9.375 22.63l-128 127.1c-9.156 9.156-22.91 11.9-34.88 6.943S64 396.9 64 383.1V128c0-12.94 7.781-24.62 19.75-29.58S109.5 96.23 118.6 105.4z" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 mr-1 arrow"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 320 512"
                    >
                      <path d="M310.6 246.6l-127.1 128C176.4 380.9 168.2 384 160 384s-16.38-3.125-22.63-9.375l-127.1-128C.2244 237.5-2.516 223.7 2.438 211.8S19.07 192 32 192h255.1c12.94 0 24.62 7.781 29.58 19.75S319.8 237.5 310.6 246.6z" />
                    </svg>
                  )}
                </span>
              )}
              <span className="h-full">{item.name}</span>
              {!left && (
                <span className="inset-y-0 left-0 flex items-center">
                  {openFolders.filter((f) => f === item.path).length === 0 ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 arrow"
                      viewBox="0 0 256 512"
                    >
                      <path d="M137.4 406.6l-128-127.1C3.125 272.4 0 264.2 0 255.1s3.125-16.38 9.375-22.63l128-127.1c9.156-9.156 22.91-11.9 34.88-6.943S192 115.1 192 128v255.1c0 12.94-7.781 24.62-19.75 29.58S146.5 415.8 137.4 406.6z" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 ml-1 arrow"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 320 512"
                    >
                      <path d="M310.6 246.6l-127.1 128C176.4 380.9 168.2 384 160 384s-16.38-3.125-22.63-9.375l-127.1-128C.2244 237.5-2.516 223.7 2.438 211.8S19.07 192 32 192h255.1c12.94 0 24.62 7.781 29.58 19.75S319.8 237.5 310.6 246.6z" />
                    </svg>
                  )}
                </span>
              )}
            </a>
          </div>
          <div
            key={item.name + "-children"}
            className={classNames(
              openFolders.filter((f) => f === item.path).length === 0
                ? "hidden"
                : "",
              left ? "mr-2" : "ml-2"
            )}
          >
            {item.children.map((child) => {
              return getNavigationChildren(
                child,
                (path !== "" ? `${path}/` : "") + item.name.replace(".md", ""),
                depth + 1,
                left
              );
            })}
          </div>
        </div>
      );
    } else if (!item.children) {
      return (
        <div
          style={
            left
              ? {
                  marginLeft: `${depth}rem`,
                }
              : {
                  marginRight: `${depth}rem`,
                }
          }
          className=""
          key={item.name}
        >
          <Link
            key={item.path}
            href={
              (path !== "" ? `/${path}` : "") +
              `/${item.name.replace(".md", "")}`
            }
          >
            <a
              onClick={() => setSidebarOpen(false)}
              className={classNames(
                "text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white",
                `group flex items-center py-2 text-base font-light`,
                left ? "mr-auto" : "ml-auto"
              )}
            >
              <span className={left ? "mr-auto" : "ml-auto"}>
                {item.name.replace(".md", "")}
              </span>
            </a>
          </Link>
        </div>
      );
    }
  };

  const search = (query: string) => {
    setSearchResults(searchIndex.search(query));
  };

  const goToPage = (pageUrl: string) => {
    router.push("/" + pageUrl).then(() => {
      setSearchQuery("");
    });
  };

  useEffect(() => {
    search(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  return (
    <ThemeProvider attribute="class" enableSystem={true}>
      <div className="mx-auto my-auto">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 flex z-40 md:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-neutral-300 dark:bg-neutral-800 bg-opacity-75" />
            </Transition.Child>
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 dark:bg-dark bg-zinc-100 border-2 dark:border-b-neutral-900 border-b-neutral-200 border-x-transparent border-t-transparent">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XIcon
                        className="h-6 w-6 text-black dark:text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex-shrink-0 flex items-center px-4 text-2xl font-semibold cursor-pointer text-indigo-600 dark:text-indigo-400">
                  <Link href="/">{process.env.NEXT_PUBLIC_PROJECT_NAME}</Link>
                </div>
                <div className="px-4 py-4">
                  <hr className="w-full border border-neutral-200 dark:border-neutral-600" />
                </div>
                <div className="px-4">
                  <ThemeChanger />
                </div>
                <div className="w-full px-4 my-3">
                  <div className="flex flex-row">
                    <label htmlFor="search-field" className="sr-only">
                      Search
                    </label>
                    <div className="w-full text-gray-400 focus-within:text-gray-400 flex flex-row bg-white rounded-md">
                      <div className="inset-y-0 flex items-center pointer-events-none pl-4">
                        <SearchIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <input
                        id="search-field"
                        className="block w-full pl-3 pr-6 border-transparent text-gray-400 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm rounded-md text-left"
                        placeholder="Search"
                        type="search"
                        name="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-neutral-800">
                  <nav className="px-4 space-y-1">{getNavigation(true)}</nav>
                </div>
                <div className="px-4">
                  <a
                    href="https://markbase.xyz"
                    className="px-3 py-2 rounded-md text-xs font-medium bg-black dark:bg-gray-100 text-white dark:text-gray-800 w-fit flex items-center cursor-pointer"
                  >
                    <img className="h-5 w-5" src={MarkbaseFavicon.src} />
                    <span className="ml-1">Made with Markbase</span>
                  </a>
                </div>
              </div>
            </Transition.Child>
            <div className="flex-shrink-0 w-14" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </Dialog>
        </Transition.Root>
        <div className="flex flex-col">
          <div className="flex flex-row sm:hidden px-4 pt-6 pb-3">
            <button
              type="button"
              className="px-4 border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="hover:text-indigo-500 text-indigo-400 cursor-pointer">
              <Link href="/">{process.env.NEXT_PUBLIC_PROJECT_NAME}</Link>
            </div>
          </div>
          <div className="px-8 sm:hidden pb-4">
            <hr className="w-full border dark:border-neutral-600 border-neutral-200" />
          </div>
          <main className="flex-1 flex flex-row text-left mx-auto w-full px-4 md:w-2/3 md:px-0">
            <div className="text-right hidden sm:block sm:w-1/4 h-screen sticky top-0 py-4 sm:py-16 ">
              <div className="flex-1 flex flex-col min-h-0 h-full border-r-2 dark:border-neutral-600 border-neutral-200 pr-0 sm:pr-4 ">
                <div className="flex items-center flex-shrink-0 px-4 text-2xl font-bold ml-auto mb-2">
                  <Link href="/">
                    <h2 className="dark:hover:text-indigo-500 hover:text-indigo-800 text-indigo-600 dark:text-indigo-400 text-right cursor-pointer">
                      {process.env.NEXT_PUBLIC_PROJECT_NAME}
                    </h2>
                  </Link>
                </div>
                <div className="px-2">
                  <ThemeChanger />
                </div>
                <div className="sticky top-0 z-10 flex-shrink-0 flex">
                  <div className="flex-1 px-2 flex my-2">
                    <div className="flex-1 flex">
                      <label htmlFor="search-field" className="sr-only">
                        Search
                      </label>
                      <div className="h-fit w-full max-w-md text-gray-600 focus-within:text-gray-800 dark:text-gray-400 dark:focus-within:text-gray-400 ml-auto">
                        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none pr-4">
                          <SearchIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <input
                          id="search-field"
                          className=" block w-full pl-10 pr-6 border-transparent text-gray-600 focus:placeholder-gray-500 placeholder-gray-500 dark:text-gray-400 dark:placeholder-gray-500 focus:outline-none dark:focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm rounded-md text-right"
                          placeholder="Search"
                          type="search"
                          name="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="">
                  <div
                    style={{ maxHeight: "80vh" }}
                    className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-900 scrollbar-track-neutral-800"
                  >
                    <nav className="flex-1 p-2">{getNavigation()}</nav>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full sm:w-3/4 pl-0 sm:pl-4 py-4 sm:py-16">
              <div
                style={{ wordBreak: "break-word" }}
                className="max-w-7xl px-4"
              >
                {searchQuery !== "" ? (
                  searchResults.length > 0 ? (
                    <div>
                      <NextSeo
                        title={
                          "Search - " + process.env.NEXT_PUBLIC_PROJECT_NAME
                        }
                      />
                      {searchResults.map((result, i) => (
                        <div
                          key={i}
                          className="cursor-pointer my-2 rounded-md border-2 border-neutral-700 p-4 hover:bg-neutral-700"
                          onClick={() => goToPage(result.ref)}
                        >
                          <div className="text-lg font-bold">
                            {
                              (
                                pageProps.documentList as SearchableDocument[]
                              ).filter((d) => d.url === result.ref)[0].name
                            }
                          </div>
                          <div>
                            {removeMd(
                              (
                                pageProps.documentList as SearchableDocument[]
                              ).filter((d) => d.url === result.ref)[0].content
                            ).substring(0, 50) + "..."}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <NextSeo
                        title={
                          "Search - " + process.env.NEXT_PUBLIC_PROJECT_NAME
                        }
                      />
                      <p>No results could be found.</p>
                    </div>
                  )
                ) : (
                  <Component {...pageProps} />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="hidden sm:block sm:fixed sm:bottom-5 sm:right-5">
        <a
          href="https://markbase.xyz"
          className="px-3 py-2 rounded-md text-xs font-medium bg-black dark:bg-gray-100 dark:text-gray-800 text-white w-fit flex items-center opacity-80 hover:opacity-100 cursor-pointer"
        >
          <img className="h-5 w-5" src={MarkbaseFavicon.src} />
          <span className="ml-1">Made with Markbase</span>
        </a>
      </div>
    </ThemeProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  // calls page's `getInitialProps` and fills `appProps.pageProps`
  const appProps = await App.getInitialProps(appContext);

  appProps.pageProps.documentList = [] as SearchableDocument[];

  appProps.pageProps.directoryTree = dirTree(path.resolve("content"), {
    extensions: /\.md/,
  });

  const files = await recursive(path.resolve("content"));
  for (const file of files) {
    if (file.endsWith(".md")) {
      let postPath = file.split(path.resolve(""))[1];
      let fileName = file.replace(/\\/g, "/").split("/")[
        file.replace(/\\/g, "/").split("/").length - 1
      ];

      postPath = postPath
        .replace(/\\/g, "/")
        .split("/")
        .map((p) => encodeURIComponent(p))
        .join("/");

      postPath = postPath.replace(/.md/g, "").replace("content/", "");

      if (postPath.startsWith("/") || postPath.startsWith("\\")) {
        postPath = postPath.substring(1);
      }

      let content = fs.readFileSync(path.resolve(file), "utf-8");

      try {
        let matterContent = matter(content, {});

        appProps.pageProps.documentList.push({
          name: fileName.replace(".md", ""),
          url: postPath,
          content: matterContent.content,
        });
      } catch (error) {
        console.error("Error in getInitialProps - ", error);
        appProps.pageProps.documentList.push({
          name: fileName.replace(".md", ""),
          url: postPath,
          content: content,
        });
      }
    }
  }

  return { ...appProps };
};

export default MyApp;
