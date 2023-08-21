$(document).ready(function() {
    console.log("JQuery working")

    // Get references to the input and button elements
    const urlInput = $('#urlInput');
    const submitButton = $('#submitButton');
    const submitButton2 = $('#submitButton2');
    const submitButton3 = $('#submitButton3');

    // Attach a click event handler to the button
    submitButton.click(function() {
        // Send a GET request to Express proxy server
        $.get('/ip-with-tor', function(data) {
            console.log('Response from ' + enteredUrl + ':', data);
        })
            .fail(function() {
                console.log('Failed to fetch data from ' + enteredUrl);
            });
    });

    submitButton2.click(function() {
        $.get('/ip-without-tor', function(data) {
            console.log('Response from ' + enteredUrl + ':', data);
        })
            .fail(function() {
                console.log('Failed to fetch data from ' + enteredUrl);
            });
    });

    submitButton3.click(function() {
        // Get the entered URL from the input field
        const enteredUrl = urlInput.val();

        $.get('/proxy/' + enteredUrl, function(data) {
            console.log('Response from ' + enteredUrl + ':', data);
        })
            .fail(function() {
                console.log('Failed to fetch data from ' + enteredUrl);
            });
    });
});
