

function copyCode() {
    var editorText = document.getElementById("editorTextid");
    editorText.select();
    document.execCommand("copy");
    var copyButton = document.getElementById("copyButton");
    copyButton.textContent = "Copied";
    setTimeout(function() {
        copyButton.textContent = "Copy";
    }, 2000); // Change back to "Copy" after 2 seconds (2000 milliseconds)
}



async function scan(username) {
    const editorText = document.getElementById("editorTextid").value;
    const scanButton = document.getElementById("scanButton");
    const spinner = document.getElementById("spinner");

    // Disable the scan button
    scanButton.disabled = true;

    // Show the spinner
    spinner.style.display = "inline-block";

    console.log(username); // Ensure `username` is passed to the function
    try {
        const response = await fetch(`/user/${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: editorText })
        });

        if (!response.ok) {
            throw new Error('Failed to update user data');
        }

        const data = await response.json();

        const { aiPercentage, humanPercentage } = data;
        if (typeof aiPercentage !== 'undefined' && typeof humanPercentage !== 'undefined') {
            showPieChart(aiPercentage, humanPercentage);
        } else {
            console.error('Error: Invalid percentage data');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Re-enable the scan button
        scanButton.disabled = false;
        
        // Hide the spinner
        spinner.style.display = "none";
    }
}


function showPieChart(aiPercentage, humanPercentage) {
    const canvas = document.getElementById("pie-chart");
    const ctx = canvas.getContext("2d");

    const total = aiPercentage + humanPercentage;
    const aiAngle = (aiPercentage / 100) * Math.PI * 2;
    const humanAngle = (humanPercentage / 100) * Math.PI * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw AI slice
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2,
        0,
        aiAngle
    );
    ctx.closePath();
    ctx.fillStyle = "#177eba";
    ctx.fill();

    // Draw Human slice
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2,
        aiAngle,
        aiAngle + humanAngle
    );
    ctx.closePath();
    ctx.fillStyle = "coral";
    ctx.fill();

    // Draw legend
    const legend = document.getElementById("pie-chart-legend");
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background-color:#177eba"></div>
            <div class="legend-label">AI Generated: ${aiPercentage.toFixed(2)} %</div>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color:coral"></div>
            <div class="legend-label">Human Generated: ${humanPercentage.toFixed(2)} %</div>
        </div>
    `;
}

