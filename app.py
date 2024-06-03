from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory

app = Flask(__name__)
app.secret_key = 'your_secret_key'

@app.route('/')
def login():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def do_login():
    try:
        patient_id = request.form['username']
        password = request.form['password']
        if password == 'password':  # 모든 비밀번호는 'password'로 통일
            session['logged_in'] = True
            session['patient_id'] = patient_id
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Invalid credentials')
    except KeyError:
        return render_template('login.html', error='Missing form data')

@app.route('/data/<path:filename>')
def data(filename):
    try:
        return send_from_directory('data', filename)
    except Exception as e:
        return str(e), 500

@app.route('/dashboard')
def dashboard():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    patient_id = session.get('patient_id')
    return render_template('dashboard.html', patient_id=patient_id)

if __name__ == '__main__':
    app.run('0.0.0.0', port=8000, debug=True)