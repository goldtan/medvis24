## Medical Analysis Tool

This Medical Analysis Tool is a web-based application designed to analyze and visualize patient medical data, particularly lab test results and prescription records. The tool enables healthcare professionals to track patient health metrics over time and identify abnormal results and medication administration.

### Features

- **Patient Data Filtering:** Filter patient data by test type and date range.
- **Dynamic Line Charts:** Visualize lab test results over time with interactive line charts.
- **Abnormal Results Highlighting:** Highlight abnormal test results with distinct markers.
- **Medication Tracking:** Indicate insulin prescription administration on the chart.
- **Customizable Date Range:** Automatically set default date ranges based on selected data but allow manual overrides.
- **Responsive Tooltips:** Display detailed information on data points when hovering over them.
- **Comprehensive Data Table:** Present detailed patient test data in a table format.

### Technologies Used

- **Frontend:** HTML, CSS (Bootstrap), JavaScript (D3.js)
- **Backend:** Python (Flask)
- **Data Storage:** CSV files (lab events and prescriptions)

### Usage

1. **Login:** Enter the patient ID and password (default password: `password`) to log in.
2. **Select Tests and Date Range:** Choose the test results to display and set the date range for the data.
3. **View Charts and Data Table:** Analyze the visualized data and review detailed test results in the table.

### Data Files

- **labevents.csv:** Contains lab test results with columns like `subject_id`, `itemid`, `charttime`, `value`, `ref_range_lower`, `ref_range_upper`, and `flag`.
- **d_labitems.csv:** Contains mapping of `itemid` to test labels.
- **prescriptions.csv:** Contains prescription records with columns like `subject_id`, `drug`, `starttime`, and `dose_val_rx`.

### Development

- **Frontend Development:** Modify `templates/` for HTML and `static/css/` for CSS.
- **Backend Development:** Modify `app.py` for Flask routes and logic.
- **JavaScript Development:** Modify `static/js/dashboard.js` for D3.js visualization logic.

### License

This project is licensed under the MIT License.

---

By providing this comprehensive tool, we aim to enhance the ability of healthcare professionals to monitor and analyze patient data effectively, facilitating better-informed decisions and improved patient outcomes.
