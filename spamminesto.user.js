// ==UserScript==
// @name Ylilauta Spamminesto
// @match *://ylilauta.org/satunnainen/*
// @exclude *://ylilauta.org/hiddenthreads
// @grant none
// @version 0.26
// @locale en
// @description Piilottaa langat ja vastaukset automaattisesti joissa on jokin mustalistattu sana tai luokitellaan spämmiksi
// ==/UserScript==
var blacklist = [
  "💩",
  "██",
  "󠀡"
];
var blacklistEmojis=false; //MUUTA true JOS HALUAT PIILOTTAA POSTAUKSET MISSÄ ON EMOJEITA

var emojiPattern=/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|[\ud83c[\ude50\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;


function hidePost(post, style) {
  setTimeout(function() {
    post.querySelector(style).click();
  }, 100)
}

function getPostText(post, number) {
  return post.querySelector(".postcontent").textContent;
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
    if(getPostText(post, number).toLowerCase().indexOf(word.toLowerCase()) > -1) {
      hidePost(post, style);
      return true;
    }
    else if (emojiPattern.test(getPostText(post, number)) && blacklistEmojis)
      hidePost(post, style);
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
    if (postMap[text] !== undefined && postMap[text]>1 && text != "" && text.toLowerCase() != "bump")
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
      else if (text=="") 
        hidePost(thread, ".thread-hide");
    }
  }
}
