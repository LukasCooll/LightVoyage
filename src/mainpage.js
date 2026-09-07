function faviconURL(pageUrl,size){
try{return `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=${size||20}`}catch(e){return ""}
}

function randomColor(){
return `hsl(${Math.random()*360},70%,60%)`
}

const color1=randomColor()
const color2=randomColor()
const angle=Math.floor(Math.random()*361)
document.body.style.backgroundImage=`linear-gradient(${angle}deg,${color1},${color2})`

const searchInput=document.querySelector('input[name="q"]')

searchInput.addEventListener("input",()=>{
if(window.parent!==window){
window.parent.postMessage({type:"SEARCH_INPUT",value:searchInput.value},"*")
}
})

const searchForm=document.querySelector("form")

searchForm.addEventListener("submit",event=>{
event.preventDefault()
const query=searchInput.value.trim()
if(!query)return
const url=`https://www.google.com/search?q=${encodeURIComponent(query)}`
if(window.parent!==window){
window.parent.postMessage({type:"LOAD_URL",url},"*")
}else{
window.location.href=url
}
})

const overlay=document.querySelector(".popup-overlay")
const popup=document.querySelector(".bookmarkpopup")

document.querySelector("#addBookmark").addEventListener("click",()=>{
overlay.classList.add("open")
popup.classList.add("open")
document.querySelector("#bmname").focus()
})

function closePopup(){
overlay.classList.remove("open")
popup.classList.remove("open")
}

document.querySelector(".bmclose").addEventListener("click",closePopup)
overlay.addEventListener("click",closePopup)

document.querySelector(".bmsubmit").addEventListener("click",()=>{
const nameInput=document.querySelector("#bmname")
const urlInput=document.querySelector("#bmurl")
const name=nameInput.value.trim()
let url=urlInput.value.trim()

if(!name){
alert("Please enter a bookmark name.")
nameInput.focus()
return
}

if(!url){
alert("Please enter a URL.")
urlInput.focus()
return
}

if(!/^https?:\/\//i.test(url))url="https://"+url

try{
const parsedURL=new URL(url)
if(!["http:","https:"].includes(parsedURL.protocol))throw new Error()
}catch{
alert("Please enter a valid URL.")
urlInput.focus()
return
}

let bookmarks=JSON.parse(localStorage.getItem("bookmarks"))||[]

if(bookmarks.some(bookmark=>bookmark.url===url)){
alert("This website is already bookmarked.")
return
}

bookmarks.push({name,url})
localStorage.setItem("bookmarks",JSON.stringify(bookmarks))
createBookmark(name,url)

nameInput.value=""
urlInput.value=""
closePopup()
})

function createBookmark(name,url){
const bookmarkList=document.querySelector("#bookmarkList")
const bookmarkItem=document.createElement("button")
bookmarkItem.className="bookmarkitem"
bookmarkItem.title=name

const bookmarkImg=document.createElement("img")
bookmarkImg.className="bookmarkimg"
bookmarkImg.src=faviconURL(url,128)
bookmarkImg.alt=name
bookmarkImg.onerror=function(){
this.src="default-favicon.png"
}

bookmarkItem.appendChild(bookmarkImg)

bookmarkItem.addEventListener("click",()=>{
if(window.parent!==window){
window.parent.postMessage({type:"LOAD_URL",url},"*")
}else{
window.location.href=url
}
})

bookmarkList.appendChild(bookmarkItem)
}

function loadBookmarks(){
const bookmarks=JSON.parse(localStorage.getItem("bookmarks"))||[]
bookmarks.forEach(bookmark=>createBookmark(bookmark.name,bookmark.url))
}

function Daytime(){
const hour=new Date().getHours()
const user="Lukas"
if(hour>=5&&hour<12)return"Good morning, "+user
if(hour>=12&&hour<18)return"Good afternoon, "+user
if(hour>=18&&hour<22)return"Good evening, "+user
return"Good night, "+user
}

loadBookmarks()