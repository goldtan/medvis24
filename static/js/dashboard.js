var margin = { top: 20, right: 60, bottom: 30, left: 60 },
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var itemIdToLabel = {};
var prescriptionsData = [];

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "#f9f9f9")
    .style("border", "1px solid #d3d3d3")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 0 10px rgba(0, 0, 0, 0.1)");

// Load test results when the page is loaded
window.onload = function() {
    loadTestResults(patientId);
};

function loadTestResults(patientId) {
    d3.csv('/data/labevents.csv').then(function(data) {
        // Filter the data to only include the selected patient
        var tests = Array.from(new Set(data.filter(function(d) {
            return d.subject_id === patientId;
        }).map(function(d) {
            return d.itemid;
        })));

        // Map itemid to label using d_labitems
        d3.csv('/data/d_labitems.csv').then(function(labitems) {
            labitems.forEach(function(d) {
                itemIdToLabel[d.itemid] = d.label;
            });

            var testResult1 = document.getElementById('testResult1');
            var testResult2 = document.getElementById('testResult2');
            
            testResult1.innerHTML = '<option value="">Select test...</option>';
            testResult2.innerHTML = '<option value="">None</option>';
            
            tests.forEach(function(test) {
                var option1 = document.createElement('option');
                var option2 = document.createElement('option');
                option1.value = test;
                option1.text = itemIdToLabel[test] || test; // Use label if available
                option2.value = test;
                option2.text = itemIdToLabel[test] || test; // Use label if available
                testResult1.appendChild(option1);
                testResult2.appendChild(option2);
            });

            testResult1.addEventListener('change', function() {
                updateTestResult2Options(testResult1.value, tests);
            });

            // Set default start and end dates
            setDefaultDates(patientId, tests);
        });
    }).catch(function(error) {
        console.error('Error loading CSV data:', error);
    });
}

function updateTestResult2Options(selectedTest, tests) {
    var testResult2 = document.getElementById('testResult2');
    testResult2.innerHTML = '<option value="">None</option>';
    
    tests.forEach(function(test) {
        if (test !== selectedTest) {
            var option = document.createElement('option');
            option.value = test;
            option.text = itemIdToLabel[test] || test; // Use label if available
            testResult2.appendChild(option);
        }
    });
}

function updateGraph() {
    // Fetch selected data set and dates
    var testResult1 = document.getElementById('testResult1').value;
    var testResult2 = document.getElementById('testResult2').value;
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;

    // Log the filter values to the console (for debugging)
    console.log('Patient ID:', patientId);
    console.log('Test Result 1:', testResult1);
    console.log('Test Result 2:', testResult2);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    // Clear existing chart
    d3.select("#lineChart").selectAll("*").remove();

    // Load the CSV data and update the chart
    loadCSVData(patientId, testResult1, testResult2, startDate, endDate);
}

function loadCSVData(patientId, testResult1, testResult2, startDate, endDate) {
    Promise.all([
        d3.csv('/data/labevents.csv'),
        d3.csv('/data/d_labitems.csv'),
        d3.csv('/data/prescriptions.csv')
    ]).then(function(files) {
        var labevents = files[0];
        var labitems = files[1];
        var prescriptions = files[2];

        // Map itemid to label using d_labitems
        var itemIdToLabel = {};
        labitems.forEach(function(d) {
            itemIdToLabel[d.itemid] = d.label;
        });

        // Filter data by patientId and date range
        var filteredData1 = labevents.filter(function(d) {
            return d.subject_id == patientId && d.itemid == testResult1 &&
                new Date(d.charttime) >= new Date(startDate) &&
                new Date(d.charttime) <= new Date(endDate);
        });

        var filteredData2 = labevents.filter(function(d) {
            return d.subject_id == patientId && d.itemid == testResult2 &&
                new Date(d.charttime) >= new Date(startDate) &&
                new Date(d.charttime) <= new Date(endDate);
        });

        // Merge label into labevents data
        filteredData1.forEach(function(d) {
            d.date = new Date(d.charttime);
            d.value = +d.value;
            d.label = itemIdToLabel[d.itemid];
            d.ref_range_lower = +d.ref_range_lower;
            d.ref_range_upper = +d.ref_range_upper;
            d.flag = d.flag;
            d.order_provider_id = d.order_provider_id;
        });

        filteredData2.forEach(function(d) {
            d.date = new Date(d.charttime);
            d.value = +d.value;
            d.label = itemIdToLabel[d.itemid];
            d.ref_range_lower = +d.ref_range_lower;
            d.ref_range_upper = +d.ref_range_upper;
            d.flag = d.flag;
            d.order_provider_id = d.order_provider_id;
        });

        console.log("Filtered Data 1:", filteredData1);
        console.log("Filtered Data 2:", filteredData2);

        // Filter insulin prescriptions for glucose tests
        var insulinData = [];
        if ((itemIdToLabel[testResult1] && itemIdToLabel[testResult1].toLowerCase() === "glucose") || 
            (testResult2 && itemIdToLabel[testResult2] && itemIdToLabel[testResult2].toLowerCase() === "glucose")) {
            insulinData = prescriptions.filter(function(d) {
                return d.subject_id == patientId && d.drug.toLowerCase() === "insulin" &&
                    new Date(d.starttime) >= new Date(startDate) &&
                    new Date(d.starttime) <= new Date(endDate);
            }).map(function(d) {
                return {
                    date: new Date(d.starttime),
                    drug: d.drug,
                    dose: d.dose_val_rx  // Add dose_val_rx to the mapped object
                };
            });
        }

        console.log("Insulin Data:", insulinData); // 확인을 위한 로그 추가

        updateLineChart(filteredData1, filteredData2, insulinData);
        updateDataTable(filteredData1.concat(filteredData2)); // Update table with filtered data
    }).catch(function(error) {
        console.error('Error loading CSV data:', error);
    });
}

function addLinesAndDots(svg, data1, data2, insulinData, x, yLeft, yRight, line1, line2) {
    var lineChart = svg.append("g")
        .attr("clip-path", "url(#clip)");

    // Add the line path for data1
    lineChart.append("path")
        .datum(data1)
        .attr("class", "line line1")
        .attr("d", line1)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5);

    // Add the line path for data2 if exists
    if (data2.length > 0) {
        lineChart.append("path")
            .datum(data2)
            .attr("class", "line line2")
            .attr("d", line2)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5);
    }

    // Add circles and triangles for data points (data1)
    lineChart.selectAll(".dot1")
        .data(data1)
        .enter().append("path")
        .attr("class", "dot1")
        .attr("d", function(d) {
            return d.flag === 'abnormal' ? d3.symbol().type(d3.symbolTriangle).size(64)() : d3.symbol().type(d3.symbolCircle).size(64)();
        })
        .attr("transform", function(d) {
            return "translate(" + x(d.date) + "," + yLeft(d.value) + ")";
        })
        .attr("fill", function(d) {
            return "steelblue";
        })
        .attr("stroke", "black")  // Add border to the points
        .attr("stroke-width", 1)  // Set border width
        .on("mouseover", function(event, d) {
            console.log(d);  // 디버깅을 위해 데이터 포인트를 콘솔에 출력
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html("<strong>Date:</strong> " + d.date.toDateString() + "<br/><strong>Value:</strong> " + d.value)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add circles for data points (data2) if exists
    if (data2.length > 0) {
        lineChart.selectAll(".dot2")
            .data(data2)
            .enter().append("circle")
            .attr("class", "dot2")
            .attr("cx", function(d) { return x(d.date); })
            .attr("cy", function(d) { return yRight(d.value); })
            .attr("r", 5)
            .attr("fill", "red")
            .attr("stroke", "black")  // Add border to the points
            .attr("stroke-width", 1)  // Set border width
            .on("mouseover", function(event, d) {
                console.log(d);  // 디버깅을 위해 데이터 포인트를 콘솔에 출력
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("<strong>Date:</strong> " + d.date.toDateString() + "<br/><strong>Value:</strong> " + d.value)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    // Add stars for insulin data points
    if (insulinData.length > 0) {
        lineChart.selectAll(".dot3")
            .data(insulinData)
            .enter().append("path")
            .attr("class", "dot3")
            .attr("d", d3.symbol().type(d3.symbolStar).size(64)())
            .attr("transform", function(d) {
                // y 좌표를 조정하여 인슐린 데이터를 높게 표시
                return "translate(" + x(d.date) + "," + (yLeft(yLeft.domain()[0]) - 20) + ")"; // 20px 더 높게 설정
            })
            .attr("fill", "yellow")
            .attr("stroke", "black")  // Add border to the points
            .attr("stroke-width", 1)  // Set border width
            .on("mouseover", function(event, d) {
                console.log(d);  // 디버깅을 위해 데이터 포인트를 콘솔에 출력
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("<strong>Date:</strong> " + d.date.toDateString() + "<br/><strong>Insulin:</strong> " + d.dose)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    return lineChart;
}

function updateLineChart(data1, data2, insulinData) {
    var margin = { top: 20, right: 60, bottom: 30, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Remove existing chart
    d3.select("#lineChart").selectAll("*").remove();

    // Create the SVG container
    var svg = d3.select("#lineChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Set up the scales
    var x = d3.scaleTime()
        .domain(d3.extent(data1.concat(data2, insulinData), function (d) { return d.date; }))
        .range([0, width]);

    var yLeft = setYScale(data1, height);
    var yRight = setYScale(data2, height);

    // Define the lines
    var line1 = d3.line()
        .curve(d3.curveMonotoneX)
        .x(function (d) { return x(d.date); })
        .y(function (d) { return yLeft(d.value); });

    var line2 = d3.line()
        .curve(d3.curveMonotoneX)
        .x(function (d) { return x(d.date); })
        .y(function (d) { return yRight(d.value); });

    // Add the X Axis
    var xAxis = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // Add the Y Axis (Left)
    var yAxisLeft = svg.append("g")
        .attr("class", "y-axis-left")
        .call(d3.axisLeft(yLeft))
        .attr("color", "steelblue");

    // Add the Y Axis (Right)
    if (data2.length > 0) {
        var yAxisRight = svg.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", "translate(" + width + " ,0)")
            .call(d3.axisRight(yRight))
            .attr("color", "red");
    }

    // Add lines and dots
    var lineChart = addLinesAndDots(svg, data1, data2, insulinData, x, yLeft, yRight, line1, line2);

    // Add min and max lines if only one dataset is selected
    if (data2.length === 0) {
        addMinMaxLines(svg, data1, yLeft, width);
    }

    // Prepare legend labels and colors
    var labels = [
        { label: data1[0] ? data1[0].label : '', color: "steelblue" },
        { label: data2[0] ? data2[0].label : '', color: "red" },
    ].filter(item => item.label !== '');

    // Add Insulin to labels only if Glucose test is selected
    if ((data1[0] && data1[0].label.toLowerCase() === 'glucose') || 
        (data2[0] && data2[0].label.toLowerCase() === 'glucose')) {
        labels.push({ label: 'Insulin', color: "yellow" });
    }

    addLegend(labels);

    // Add zoom behavior
    addZoom(svg, x, xAxis, lineChart, line1, line2, yLeft, yRight, data1, data2);
}

function filterInsulinData(data1) {
    return prescriptionsData.filter(function(d) {
        return d.subject_id === data1[0].subject_id && d.drug === 'insulin' &&
            new Date(d.starttime) >= d3.min(data1, function(d) { return d.date; }) &&
            new Date(d.starttime) <= d3.max(data1, function(d) { return d.date; });
    }).map(function(d) {
        d.date = new Date(d.starttime);
        return d;
    });
}

function setDefaultDates(patientId, tests) {
    d3.csv('/data/labevents.csv').then(function(data) {
        var dates = data.filter(function(d) {
            return d.subject_id === patientId && tests.includes(d.itemid);
        }).map(function(d) {
            return new Date(d.charttime);
        });

        if (dates.length > 0) {
            var startDate = new Date(Math.min.apply(null, dates));
            var endDate = new Date(Math.max.apply(null, dates));

            var startDateInput = document.getElementById('startDate');
            var endDateInput = document.getElementById('endDate');

            // Check if input fields are empty before setting default dates
            if (!startDateInput.value) {
                startDateInput.value = startDate.toISOString().split('T')[0];
            }
            if (!endDateInput.value) {
                endDateInput.value = endDate.toISOString().split('T')[0];
            }
        }
    });
}

function updateDataTable(data) {
    var tbody = d3.select("#testData");
    tbody.selectAll("tr").remove();

    data.forEach(function(d) {
        if (!d.date) {
            console.error('Missing date in data row:', d);
            return;
        }
        var tr = tbody.append("tr");

        tr.append("td").text(d.date.toISOString().split('T')[0] + ' ' + d.date.toTimeString().split(' ')[0]);
        tr.append("td").text(d.label); // Correctly set the test type
        tr.append("td").text(d.value);
        tr.append("td").text(d.ref_range_lower + ' - ' + d.ref_range_upper);
        tr.append("td").text(d.flag === 'abnormal' ? 'Abnormal' : '');
    });
}

function addLegend(labels) {
    var legendContainer = d3.select("#legend");
    legendContainer.selectAll("*").remove(); // Clear any existing content

    var legend = legendContainer.selectAll(".legend")
        .data(labels)
        .enter().append("div")
        .attr("class", "legend")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin", "5px");

    legend.append("div")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", function(d) { return d.color; })
        .style("margin-right", "5px");

    legend.append("span")
        .text(function(d) { return d.label; });
}

function addZoom(svg, x, xAxis, lineChart, line1, line2, yLeft, yRight, data1, data2) {
    var zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[-width, -height], [2 * width, 2 * height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", function(event) {
            var newX = event.transform.rescaleX(x);
            xAxis.call(d3.axisBottom(newX));
            lineChart.selectAll('.line1').attr('d', line1.x(function (d) { return newX(d.date); }));
            if (data2.length > 0) {
                lineChart.selectAll('.line2').attr('d', line2.x(function (d) { return newX(d.date); }));
            }
            lineChart.selectAll('.dot1').attr('transform', function(d) {
                return "translate(" + newX(d.date) + "," + yLeft(d.value) + ")";
            });
            if (data2.length > 0) {
                lineChart.selectAll('.dot2').attr('transform', function(d) {
                    return "translate(" + newX(d.date) + "," + yRight(d.value) + ")";
                });
            }

            lineChart.selectAll('.dot3').attr('transform', function(d) {
                return "translate(" + newX(d.date) + "," + (yLeft(yLeft.domain()[0]) - 10) + ")";
            });

            if (data2.length === 0 && data1.length > 0) {
                var min = data1[0].ref_range_lower;
                var max = data1[0].ref_range_upper;

                svg.selectAll(".minLine")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yLeft(min))
                    .attr("y2", yLeft(min));

                svg.selectAll(".maxLine")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yLeft(max))
                    .attr("y2", yLeft(max));
            }
        });

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(zoom);
}

function setYScale(data, height) {
    var yMin = d3.min(data, function(d) { return d.value; });
    var yMax = d3.max(data, function(d) { return d.value; });
    var yCenter = (yMin + yMax) / 2;
    var yRange = Math.max(yMax - yMin, 10); // Ensure a minimum range to prevent zoom issues

    return d3.scaleLinear()
        .domain([yCenter - yRange / 2, yCenter + yRange / 2])
        .range([height, 0]);
}

function addMinMaxLines(svg, data1, yLeft, width) {
    // Get the min and max values from the data
    var min = d3.min(data1, function(d) { return d.ref_range_lower; });
    var max = d3.max(data1, function(d) { return d.ref_range_upper; });

    // Get the y-axis range
    var yRange = yLeft.domain();

    // Add the min line if within y-axis range
    if (min >= yRange[0] && min <= yRange[1]) {
        svg.append("line")
            .attr("class", "minLine")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yLeft(min))
            .attr("y2", yLeft(min))
            .attr("stroke", "red")
            .attr("stroke-width", 2)  // Adjust the stroke width for a thicker line
            .attr("stroke-dasharray", "5,5");
    }

    // Add the max line if within y-axis range
    if (max >= yRange[0] && max <= yRange[1]) {
        svg.append("line")
            .attr("class", "maxLine")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yLeft(max))
            .attr("y2", yLeft(max))
            .attr("stroke", "red")
            .attr("stroke-width", 2)  // Adjust the stroke width for a thicker line
            .attr("stroke-dasharray", "5,5");
    }
}