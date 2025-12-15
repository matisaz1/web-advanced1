//function printNames(){
//  document.write("John")
//   document.write("<br>");
// setTimeout(function(){document.write("Ana") ; }, 3000);
//  document.write("Bob");
//}

//printNames()

var colors= ['red', 'green', "blue", 'purple'];

function changeBgColor(){
    document.querySelector('body').style.background =
    colors[Math.floor(Math.random()*colors.length)];
}

changeBgColor();

var names = ['John', 'Ana', 'Bob', 'Mark'];

function changeNames(){
    document.querySelector('p').innerHTML = 
    names[Math.floor(Math.random()*names.length)]
}