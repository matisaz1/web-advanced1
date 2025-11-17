function showMessage() {
    alert('Hello from the function!');
}
//showMessage();

function sum(number1, number2) {
    return number1 + number2;
}

console.log(sum(25, 5));
console.log(sum(50, 50));

function toCelsius(fahrenheit) {
    return (5 / 9) * (fahrenheit - 32);
}
console.log("54m farenheit is equal to"+toCelsius(54)+" celsius");

//var arrowFunction = () => alert('Hello from arrow function!');
var arrowFunction = name => alert('Hello ${name}');
arrowFunction('Matis');
// Converts minutes into seconds
function minutesToSeconds(minutes) {
    return minutes * 60;
}

console.log("5 minutes is equal to " + minutesToSeconds(5) + " seconds");
console.log("10 minutes is equal to " + minutesToSeconds(10) + " seconds");

// Calculates the area of a triangle
function triangleArea(base, height) {
    return (base * height) / 2;
}

console.log("Triangle area with base 10 and height 5 is: " + triangleArea(10, 5));
console.log("Triangle area with base 7 and height 3 is: " + triangleArea(7, 3));


var car = {name: "BMW", model: "X7", year: 2018, color: "black", km: 0, startEngine : function() {alert("VROOM!!!");} };

get getKilometers() {
    return this.km;
}
set setKilometers(km) {
    this.km = km;
}

var school = {
    name: "Digital School",
    subjects: ["HTML", "CSS", "JavaScript"],
    students: 1500,
    year: 2016
};

alert(car.name);

alert(car["color"]);

car.startEngine();

var computer = new Object()
computer.name = "Rampage"
computer.CPU = "AMD Ryzen 7 9800X3D"
computer.RAM = "64GB"
computer.GPU = "NVIDIA RTX 5090"
computer.type = function() {
    return this.name + ", " + this.CPU + ", " + this.RAM + ", " + this.GPU;
}

console.log(computer.type());
//delete computer.GPU;

console.log(car.getKilometers);

car.setKilometers = 150;

console.log(car.getKilometers);

//Constructors

function Computer(name, CPU, RAM, GPU) {
    this.name = name;
    this.CPU = CPU;
    this.RAM = RAM;
    this.GPU = GPU;
}

var computer1 = new Computer("Predator", "Intel i9-13900K", "32GB", "NVIDIA RTX 4080");
var computer2 = new Computer("Legion", "AMD Ryzen 9 7950X", "64GB", "NVIDIA RTX 4090");

//functions, parameters, arguments, local and global variable, objects, attributes, methods, constructors 