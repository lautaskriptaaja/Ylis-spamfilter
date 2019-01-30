// ==UserScript==
// @name Ylilauta Spamminesto
// @match *://ylilauta.org/satunnainen*
// @exclude *://ylilauta.org/hiddenthreads
// @require https://github.com/lautaskriptaaja/Ylis-spamfilter/raw/master/blacklist.txt
// @require https://github.com/lautaskriptaaja/Ylis-spamfilter/raw/master/runsafely.user.js
// @version 0.59
// @locale en
// @description Piilottaa langat ja vastaukset automaattisesti joissa on jokin mustalistattu sana tai luokitellaan spämmiksi
// ==/UserScript==

let delete_hided_threads=true; //poistaa kaikki hidetetyt langat näkyvistä, suositeltavaa olla päällä! voi tarkistaa toimivuuden https://ylilauta.org/hiddenthreads
let delete_hided_posts=true; //poistaa hidetetyt postaukset näkyvistä. tätä on vaikeampi tarkistaa kuin ylläolevaa
let blacklist_enabled=true; //muuttujaksi asetuksiin
let using_common_blacklist=true; //muuttujaksi asetuksiin
let blacklist_words = []; //muuttujaksi asetuksiin, tähän voi lisätä omia mustalista-sanoja, syntaksilla: ["sana1", "sana2", "lause kolmonen"];
let blacklistEmojis=false; //muuttujaksi asetuksiin
let detect_minutes=180; //muuttujaksi asetuksiin, kyseessä kuinka monta minuuttia postauksen jälkeen hidetetään tismalleen samat viestit
let hide_pastas=true; //muuttujaksi asetuksiin, hidettää pastat
let pasta_expire_hours = 336; //muuttujaksi asetuksiin, hidettää pastan tällä aikavälillä, oletuksena 2 viikkoa
let hide_foreign_texts=true; //muuttujaksi asetuksiin, hidettää mikäli tunnistaa muuksi kuin suomen- tai englanninkieleksi, toimii laajalti myös emojispämmiin
let foreign_threshold=0.1; //muuttujaksi asetuksiin, jos tekstissä on enemmän kuin tämän verran ihmemerkkejä, hideen suoraan
let enable_flood_restriction=true; //muuttujaksi asetuksiin, melko tiukka floodin esto -menetelmä, optimointivaraa
let detect_flood_minutes=5; //kuinka pitkältä ajalta hakee floodia
let hide_same_videos=true; //muuttujaksi...
let hide_wiki_texts=true;
let LocalStorage;
let emojiPattern=/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|[\ud83c[\ude50\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;


function hashCode(string) {
  var hash = 0, i, chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr   = string.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function hidePost(post, style) {
  setTimeout(function() {
    post.querySelector(style).click();
  }, 100)
}

function getPostText(post) {
  return post.querySelector(".postcontent").textContent;
}
function getPostTime(post) {
  let posttime = post.querySelector(".posttime")
  if (posttime == null)
    return null
  return Math.round(new Date(posttime.dateTime)/1000)
}
//Tarkistaa onko liian paljon samankaltaisuutta
function countDuplicates(text) {
  const splitted = text.split(/\s+/g);
  const wordcount = new Set(splitted).size;
  const ratio = wordcount / splitted.length;

  if (wordcount > 0 && ratio < 0.1)
    return true;
  else if (wordcount > 0 && text.length / wordcount > 300)
    return true;
  else
    return false;
}

//Antaa postauksille hash-summan ja hidettää kaikki seuraavan detect_minutes aikana tulevat identiteettiset postaukset
function hideDuplicatePosts(post) {
  if (getPostText(post)=="")
    return false;
  let hash = hashCode(getPostText(post));
  let timestamp = getPostTime(post);
  if (timestamp==null)
    return false;
  
  let localstorage_value = getItem(hash, "posts");
  if (localstorage_value==null) {
    setItem(hash, "posts", timestamp);
    return false;
  }
  else if (timestamp > localstorage_value + detect_minutes*60) {
    setItem(hash, "posts", timestamp);
    return false;
  }
  else if (timestamp <= localstorage_value) {
    setItem(hash, "posts", timestamp);
    return false;
  }
  return true;
}
function hideBlackList(text) {
  if (using_common_blacklist)
    var new_list = blacklist_words.concat(blacklist);
  else
    var new_list = blacklist_words;
  for(let word of new_list) {
    if(text.toLowerCase().indexOf(word.toLowerCase()) > -1)
      return true;
    else if (emojiPattern.test(text) && blacklistEmojis)
      return true;
  }
  return false;
}
function detectPastas(post) {
  let text = getPostText(post)
  let hash = hashCode(text);
  let timestamp = getPostTime(post);
  if (timestamp == null)
    return false;
  if (text.length<800)
    return false;
  let localstorage_hash = getItem(hash, "pasta");
  if (localstorage_hash==null) {
    setItem(hash, "pasta", timestamp);
    return false;
  }
   else if (timestamp > localstorage_hash + pasta_expire_hours*60*60) {
    setItem(hash, "pasta", timestamp);
    return false;
  }
  else if (timestamp <= localstorage_hash) {
    setItem(hash, "pasta", timestamp);
    return false;
  }
  return true;
}
//testataan ulkomaisten merkkien määrä
function detectForeign(text) {
  let old_length = text.length;
  if (old_length<300 || !hide_foreign_texts)
    return false;
  let regex=/([^\u0000-\u007F]+)/g; //unicode-characters
  let regex2=/[äöåÄÖÅ\s]/g; //ääkköset
  let stripped_text = text.replace(regex2,"").match(regex);
  if (stripped_text==null)
    return false;
  let new_length = stripped_text.join("").length;
  if (new_length / old_length > foreign_threshold) {
    return true;
  }
  else
    return false;
  
}

function preventSameVideo(post) {
  if (!hide_same_videos)
    return false;
  let figcaption = post.querySelector("figcaption");
  if (figcaption==null)
    return false;
  let url = figcaption.querySelector("a");
  if (url==null)
    return false;
  let timestamp = getPostTime(post);
  if (timestamp==null)
    return false;
  let hash = hashCode(figcaption.innerText);
  let localstorage_value = getItem(hash, "videos");
  
  if (localstorage_value==null) {
    setItem(hash, "videos", timestamp);
    return false;
  }
  else if (timestamp > localstorage_value + detect_minutes*60) {
    setItem(hash, "videos", timestamp);
    return false;
  }
  else if (timestamp <= localstorage_value) {
    setItem(hash, "videos", timestamp);
    return false;
  }
  return true;

}

function detectWiki(text) {
  if (!hide_wiki_texts)
    return false;
  let regex=/(\[[0-9]\])/g;
  let list = text.match(regex);
  if (list!=null && list.length>=2)
    return true;
  else
    return false;
}

//tunnistetaan mahdollinen floodi
function detectFlood(post) {
  if (!enable_flood_restriction)
    return false;
  let text = getPostText(post);
  let rows=text.split(/\r\n|\r|\n/).length;
  if (rows<10)
    return false;
  let length=text.length;
  let timestamp=getPostTime(post);
  if (timestamp==null)
    return false;
  let found=false;
  let floodCount=0;
  
  for (var i=0;i<LocalStorage["flood"].length;i++) {
    if (LocalStorage["flood"][i]["time"]==timestamp && LocalStorage["flood"][i]["rows"]==rows && LocalStorage["flood"][i]["len"]==length)
      found=true;
    else if (Math.abs(timestamp-LocalStorage["flood"][i]["time"]) < detect_flood_minutes*60 && Math.abs(rows-LocalStorage["flood"][i]["rows"])<=1 && Math.abs(1-length/LocalStorage["flood"][i]["len"]) < 0.2)
      floodCount++;
  }
  if (!found)
    LocalStorage["flood"].push({"time":timestamp, "rows":rows, "len":length});
  if (floodCount>=3)
    return true;
}


//Tyhjennetään localstorage-hashit viemästä tilaa, suoritetaan detect_minutes-muuttujan mukaan
function clearOldHashes() {
  let current_timestamp = Date.now()/1000 | 0;
  let time_since_last_purge = LocalStorage["time_since_last_purge"];
  if (time_since_last_purge != null && Math.floor(current_timestamp - time_since_last_purge) < detect_minutes*60)
    return;
  for (thread in LocalStorage["posts"]) {
    if (Math.floor(current_timestamp - getItem(thread, "posts")) > detect_minutes*60)
      removeItem(thread, "posts");
  }
  for (thread in LocalStorage["pasta"]) {
    if (Math.floor(current_timestamp - getItem(thread, "pasta")) > pasta_expire_hours*60*60)
      removeItem(thread, "pasta");
  }
  for (thread in LocalStorage["videos"]) {
    if (Math.floor(current_timestamp - getItem(thread, "videos")) > detect_minutes*60)
      removeItem(thread, "videos");
  }
  for (var i=LocalStorage["flood"].length-1;i>=0;i--) {
    if (Math.floor(current_timestamp - LocalStorage["flood"][i]["timestamp"]) > detect_minutes*60)
      LocalStorage["flood"].splice(i, 1);
  }
  LocalStorage["time_since_last_purge"]=current_timestamp;
}

function loadLocalStorage() {
  LocalStorage = JSON.parse(localStorage.getItem("spamminesto"));
  if (LocalStorage == null)
    LocalStorage = {"posts": {}, "pasta":{}, "flood":[], "videos":{}, "time_since_last_purge":0};
  if (!("posts" in LocalStorage))
    LocalStorage["posts"]={};
  if (!("pasta" in LocalStorage))
    LocalStorage["pasta"]={};
  if (!("videos" in LocalStorage))
    LocalStorage["videos"]={};
  if (!("flood" in LocalStorage))
    LocalStorage["flood"]=[];
  if (!("time_since_last_purge" in LocalStorage))
    LocalStorage["time_since_last_purge"]=null;
  
}
function saveLocalStorage() {
  localStorage.setItem("spamminesto", JSON.stringify(LocalStorage));
}

function getItem(key, style) {
  return LocalStorage[style][key];
}
function setItem(key, style, value) {
  LocalStorage[style][key] = value;
}
function removeItem(key, style) {
  delete LocalStorage[style][key]
}

function hideLoop(post, style) {
  const text = getPostText(post);
  if (hideBlackList(text))
    hidePost(post, style)
  else if (detectWiki(text))
    hidePost(post, style)
  else if (preventSameVideo(post))
    hidePost(post, style)
  else if (detectForeign(text))
    hidePost(post, style)
  else if (countDuplicates(text))
    hidePost(post, style)
  else if (detectFlood(post))
    hidePost(post, style)
  else if (detectPastas(post))
    hidePost(post, style)
  else if (hideDuplicatePosts(post))
    hidePost(post, style)
}

runSafely(() => {
  loadLocalStorage();
  clearOldHashes();
  let threads = document.querySelectorAll("div.thread");
  for(let thread of threads) {
    hideLoop(thread, ".thread-hide");
  }

  let answers = document.querySelectorAll(".answer");
  for(let answer of answers) {
    hideLoop(answer, ".post-hide");
  }

  setTimeout(function() {
    if (delete_hided_posts) {
      let hiddenAnswers = document.querySelectorAll(".answer.hidden");
      for (let hidden of hiddenAnswers) {
        hidden.parentNode.removeChild(hidden);
      }
    }
    if (delete_hided_threads) {
      let hiddenThreads = document.querySelectorAll(".just-hidden");
      for (let thread of hiddenThreads)
        thread.parentNode.removeChild(thread);
    }
  }, 300)
  saveLocalStorage();
});
