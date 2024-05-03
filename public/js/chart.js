
$(document).ready(async function () {
    const MAX_DATA_COUNT = 25;

    function configureChart(ctx, label, backgroundColor, borderColor) {
        return new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: label,
                        fill: true,
                        backgroundColor: backgroundColor,
                        borderColor: borderColor,
                        lineTension: 0.33,
                        data: []
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'white'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'white',
                            stepSize: 0.1

                        },
                        //beginAtZero: true
                        
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }

    function addData(lineChart, label, data) {
        lineChart.data.labels.push(label); //timestamp
        lineChart.data.datasets.forEach((dataset) => {
            dataset.data.push(data);
        });
        lineChart.update();
    }

    function removeFirstData(lineChart) {
        lineChart.data.labels.splice(0, 1);
        lineChart.data.datasets.forEach((dataset) => {
            dataset.data.shift();
        });
        lineChart.update();
    }

    function handleSocketData(lineChart, msg) {
        console.log(`Otrzymano dane z czujnika :: ${msg.date} :: ${msg.value}`);

        if (lineChart.data.labels.length > MAX_DATA_COUNT) {
            removeFirstData(lineChart);
        }
        addData(lineChart, msg.date, msg.value);

        while (lineChart.data.labels.length > MAX_DATA_COUNT) {
            removeFirstData(lineChart);
        }
    }

    const ctx1 = document.getElementById("lineChart1").getContext("2d");
    const lineChart1 = configureChart(ctx1, "Voltage 1", "rgba(255, 0, 255, 0.5)", "rgb(255, 0, 255)");


    // const ctx2 = document.getElementById("lineChart2").getContext("2d");
    // const lineChart2 = configureChart(ctx2, "Voltage 2", "rgba(255, 0, 255, 0.5)", "rgb(255,0 , 255)");

    // const ctx3 = document.getElementById("lineChart3").getContext("2d");
    // const lineChart3 = configureChart(ctx3, "Voltage 3", "rgba(31,53,235,0.5)", "rgb(31, 53, 235)");
// Pobierz aktualny adres URL

    const ws = new WebSocket('wss://mszczerkovski.onrender.com/ws');   
    
    
    // Obsługa zdarzenia 'open', które zostanie wywołane, gdy połączenie z serwerem zostanie nawiązane
    ws.onopen = () => {
        console.log('Connected TO WS SERVER');
    };
    
    ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        const data = JSON.parse(event.data.trim()); // Parsowanie danych z JSON
        console.log('Message from server:', data);
        var exampleMsg = {
            date: new Date().toLocaleTimeString(),
            value: parseFloat(data["Sensor Value"]).toFixed(1)
        };
        handleSocketData(lineChart1, exampleMsg);
    };
});