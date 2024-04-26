
document.addEventListener("DOMContentLoaded", showPieChart);
ai = 20;
human = 80;
function showPieChart() {
    console.log("pie-chart on load");

    let sliceA = { size: ai, color: "skyblue" };
    let sliceB = { size: human, color: "coral" };

    const values = [sliceA.size, sliceB.size];

    const total = values.reduce((acc, val) => acc + val, 0);

    let startAngle = 0;

    //   Values of the pie chart  %

    const canvas = document.getElementById("pie-chart");
    const ctx = canvas.getContext("2d");

    //   Calculate angles

    values.forEach((value, index) => {
        const angle = (value / total) * Math.PI * 2;

        // Draw a slice
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 2,
            startAngle,
            startAngle + angle
        );
        ctx.closePath();

        ctx.fillStyle = index === 0 ? sliceA.color : sliceB.color;
        ctx.fill();

        startAngle += angle;
    });

    //   show legend

    const legend = document.getElementById("pie-chart-legend");

    legend.innerHTML = `
  <div class="legend-item">
  <div class="legend-color" style="background-color:${sliceA.color}"></div>
  <div class="legend-label">AI Generated: ${(
            (sliceA.size / total) *
            100
        ).toFixed(2)} %</div>
  </div>
  <div class="legend-item">
  <div class="legend-color" style="background-color:${sliceB.color}"></div>
  <div class="legend-label">Human Generated: ${(
            (sliceB.size / total) *
            100
        ).toFixed(2)} %</div>
  </div>
  `;
}