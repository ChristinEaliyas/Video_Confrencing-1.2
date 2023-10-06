function createRoom() {
    var linkUrl = document.getElementById("create-link").getAttribute("href");
    window.location.href = linkUrl
}
window.onload = function() {
    document.getElementById("new-meeting").onclick = createRoom;
};