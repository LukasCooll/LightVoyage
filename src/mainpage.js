function faviconURL(pageUrl,size){
try{
return `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=${size||20}`
}catch(e){
return ""
}
}

function randomColor(){
return `hsl(${Math.floor(Math.random()*360)},70%,60%)`
}

function randomGradient(){
const color1=randomColor()
const color2=randomColor()
const angle=Math.floor(Math.random()*361)
return {color1,color2,angle}
}

function applyBackground(){
const mode=localStorage.getItem("backgroundMode")||"random"

if(mode==="solid"){
const color=localStorage.getItem("solidColor")||"#2A7B9B"
document.body.style.backgroundImage="none"
document.body.style.backgroundColor=color
return
}

if(mode==="gradient"){
const color1=localStorage.getItem("gradientColor1")||"#2A7B9B"
const color2=localStorage.getItem("gradientColor2")||"#57C785"
const angle=localStorage.getItem("gradientAngle")||90
document.body.style.backgroundColor=""
document.body.style.backgroundImage=`linear-gradient(${angle}deg,${color1},${color2})`
return
}

const gradient=randomGradient()
document.body.style.backgroundColor=""
document.body.style.backgroundImage=`linear-gradient(${gradient.angle}deg,${gradient.color1},${gradient.color2})`
}

const backgroundOptions=document.querySelectorAll(".background-option")
const solidSettings=document.getElementById("solidSettings")
const gradientSettings=document.getElementById("gradientSettings")
const solidColor=document.getElementById("solidColor")
const gradientColor1=document.getElementById("gradientColor1")
const gradientColor2=document.getElementById("gradientColor2")
const gradientAngle=document.getElementById("gradientAngle")
const randomizeGradient=document.getElementById("randomizeGradient")

function updateBackgroundControls(){
const mode=localStorage.getItem("backgroundMode")||"random"

backgroundOptions.forEach(option=>{
option.classList.toggle("active",option.dataset.background===mode)
})

solidSettings.classList.toggle("open",mode==="solid")
gradientSettings.classList.toggle("open",mode==="gradient")
}

backgroundOptions.forEach(option=>{
option.addEventListener("click",()=>{
const mode=option.dataset.background
localStorage.setItem("backgroundMode",mode)

if(mode==="random"){
const gradient=randomGradient()
document.body.style.backgroundColor=""
document.body.style.backgroundImage=`linear-gradient(${gradient.angle}deg,${gradient.color1},${gradient.color2})`
}else{
applyBackground()
}

updateBackgroundControls()
})
})

solidColor.addEventListener("input",()=>{
localStorage.setItem("solidColor",solidColor.value)
if((localStorage.getItem("backgroundMode")||"random")==="solid")applyBackground()
})

gradientColor1.addEventListener("input",()=>{
localStorage.setItem("gradientColor1",gradientColor1.value)
if((localStorage.getItem("backgroundMode")||"random")==="gradient")applyBackground()
})

gradientColor2.addEventListener("input",()=>{
localStorage.setItem("gradientColor2",gradientColor2.value)
if((localStorage.getItem("backgroundMode")||"random")==="gradient")applyBackground()
})

gradientAngle.addEventListener("input",()=>{
localStorage.setItem("gradientAngle",gradientAngle.value)
if((localStorage.getItem("backgroundMode")||"random")==="gradient")applyBackground()
})

randomizeGradient.addEventListener("click",()=>{
const gradient=randomGradient()
gradientColor1.value=gradient.color1
gradientColor2.value=gradient.color2
gradientAngle.value=gradient.angle
localStorage.setItem("gradientColor1",gradient.color1)
localStorage.setItem("gradientColor2",gradient.color2)
localStorage.setItem("gradientAngle",gradient.angle)
document.body.style.backgroundColor=""
document.body.style.backgroundImage=`linear-gradient(${gradient.angle}deg,${gradient.color1},${gradient.color2})`
})

applyBackground()
updateBackgroundControls()

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

if(!/^https?:\/\//i.test(url)) url="https://"+url

try{
    const parsedURL=new URL(url)

    if(!["http:","https:"].includes(parsedURL.protocol)) throw new Error()
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
bookmarkImg.src=faviconURL(url,512)
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
