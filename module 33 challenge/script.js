function hideErrors() {
    ["name", "username", "password", "email"].forEach(id => {
        document.getElementById(id + "_error").style.visibility = "hidden";
        document.getElementById(id).classList.remove("input-error");
    });
}

function showError(id, msg) {
    document.getElementById(id + "_error").textContent = msg;
    document.getElementById(id + "_error").style.visibility = "visible";
    document.getElementById(id).classList.add("input-error");
}

function validate() {
    hideErrors();

    let valid = true;

    let name = document.getElementById("name").value.trim();
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let email = document.getElementById("email").value.trim();

    // REGEX patterns (exact match)
    let nameRegex = /^Matis Azizi$/;
    let usernameRegex = /^matisazi11$/;
    let passwordRegex = /^Matis!1234$/;
    let emailRegex = /^matisazizi11@gmail\.com$/;

    if (!nameRegex.test(name)) {
        showError("name", "Invalid Name");
        valid = false;
    }

    if (!usernameRegex.test(username)) {
        showError("username", "Invalid Username");
        valid = false;
    }

    if (!passwordRegex.test(password)) {
        showError("password", "Invalid Password");
        valid = false;
    }

    if (!emailRegex.test(email)) {
        showError("email", "Invalid Email");
        valid = false;
    }

    if (!valid) return false;

    alert("All fields are correct!");
    return true;
}
