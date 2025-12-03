var input = document.getElementById('input_id')
var button = document.getElementById('btn_id')
var text = document.getElementById('text_id')

button.onclick = function(){
    text.innerHTML = input.value;
} 

//Regular Expressions

var text = "The best school in the world is Digital School!"
var result = text.search("Digital School");
document.getElementById('result1').innerHTML = result;

//search method

var text = "The best school in the world is Digital School!"
var result = text.search(/Digital School/);
document.getElementById('result2').innerHTML = result;


//replace method
var text = "The best school in the world is Digital School!"
var result = text.replace(/DigitalSchool/, "Another School");
document.getElementById('result3').innerHTML = result

//test method

var text = "abcdef"
var regex = new RegExp('zxh')
document.getElementById('result4').innerHTML = text.match(regex);

//match method

var text = "My school is the best school in the world!";
var regex = /school/g;
document.getElementById("result5").innerHTML = text.match(regex)

var text = "Digital School is the best school in the world!";
var regex = /i/g;
document.getElementById("result6").innerHTML = text.match(regex) 

var text = "Digital School is the best school in the world!";
var regex = /[abc]/g;
document.getElementById("result7").innerHTML = text.match(regex) 

var text = "Digital School is the best school in the world!";
var regex = /[0-9]/g;
document.getElementById("result8").innerHTML = text.match(regex)

var text = "Digital School is the best school in the world!";
var regex = /(top|best|school)/g;
document.getElementById("result9").innerHTML = text.match(regex) 

var text = "100 pecent!";
var regex = /\d/g;
document.getElementById("result10").innerHTML = text.match(regex)

var text = "100 pecent!";
var regex = /\s/g;
document.getElementById("result11").innerHTML = text.match(regex)

var text = "Heyy, how are you??";
var regex = /e+/g;
document.getElementById("result12").innerHTML = text.match(regex)

var text = "so, I hope we'll see again soon.....";
var regex = /so*/g;
document.getElementById("result13").innerHTML = text.match(regex)

var text = "Hey, hi, hiiii";
var regex = /hi?/g;
document.getElementById("result14").innerHTML = text.match(regex)

var text = "hello, helloo, hellooo, helloooo, hellooooo!!!";
var regex = /o{3}/g;
document.getElementById("result15").innerHTML = text.match(regex)

var text = "hello, helloo, hellooo, helloooo, hellooooo!!!";
var regex = /o{3,5}/g;
document.getElementById("result16").innerHTML = text.match(regex)

var text = "bestfriend, friend";
var regex = /end$/g;
document.getElementById("result17").innerHTML = text.match(regex)

var text = "cat, category, catalog";
var regex = /^cat/g;
document.getElementById("result18").innerHTML = text.match(regex)
