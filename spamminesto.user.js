// ==UserScript==
// @name Ylilauta Spamminesto
// @match *://ylilauta.org/*
// @exclude *://ylilauta.org/hiddenthreads
// @grant none
// @version 0.1
// @locale en
// @description Piilottaa langat ja vastaukset automaattisesti joissa on jokin mustalistattu sana tai luokitellaan spämmiksi
// ==/UserScript==
var blacklist = [
  "💩",
  "██████"
];

function hidePost(post, style) {
  setTimeout(function() {
    post.querySelector(style).click();
  }, 100)
}

function getPostText(post, number) {
  return post.childNodes[number].childNodes[post.childNodes[number].childNodes.length-1].textContent.toLowerCase();
}
function countDuplicates(post, number) {
  const splitted = getPostText(post,number).split(/\s+/g);
  const wordcount = new Set(splitted).size;
  const ratio = wordcount / splitted.length;

  if (wordcount > 0 && ratio < 0.1)
    return true;
  else
    return false;
}

function hideBlackList(post, number, style) {
  for(let word of blacklist) {
    if(post.childNodes[number].childNodes[post.childNodes[number].childNodes.length-1].textContent.toLowerCase().indexOf(word.toLowerCase()) > -1) {
      hidePost(post, style);
      return true;
    }
  }
  return false;
}

var catalog=true;
const threadMap = {};
var threads = document.querySelectorAll(".op_post");
for(let thread of threads) {
  catalog=false;
  var hided = hideBlackList(thread, 2, ".thread-hide");
  if (!hided) {
    const text = getPostText(thread, 2);
    if (threadMap[text] === undefined)
      threadMap[text] = 1;
    else
      threadMap[text]++;
    if (threadMap[text]>1)
      hidePost(thread, ".thread-hide");
    else if (countDuplicates(thread, 2))
      hidePost(thread, ".thread-hide");
  }
}

const postMap = {};
var answers = document.querySelectorAll(".answer");
for(let answer of answers) {
  var hided = hideBlackList(answer, 1, ".post-hide");
  if (!hided) {
    const text = getPostText(answer, 1);
    if (postMap[text] === undefined)
      postMap[text] = 1;
    else
      postMap[text]++;
    if (postMap[text] !== undefined && postMap[text]>1)
      hidePost(answer, ".post-hide");
    else if (countDuplicates(answer, 1))
      hidePost(answer, ".post-hide");
  }
}
if (catalog) {
  var catalog_threads = document.querySelectorAll(".thread");
  for(let thread of catalog_threads) {
    var hided = hideBlackList(thread, 0, ".thread-hide");
    if (!hided) {
      const text = getPostText(thread, 0);
      if (threadMap[text] === undefined)
        threadMap[text] = 1;
      else
        threadMap[text]++;
      if (threadMap[text]>1)
        hidePost(thread, ".thread-hide");
      else if (countDuplicates(thread, 0))
        hidePost(thread, ".thread-hide");
    }
  }
}
