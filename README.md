# Latency Tracker

A real-time network latency monitoring dashboard that tracks ping times across multiple domains. Built with FastAPI backend and a modern, responsive frontend.

![Latency Tracker Dashboard](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)

## Features

- 📊 **Real-time Monitoring**: Automatically pings tracked domains every minute
- 📈 **Interactive Charts**: Visualize latency trends over time with Chart.js
- 🎯 **Multi-Domain Tracking**: Monitor multiple domains simultaneously
- ⚙️ **Dynamic Configuration**: Add or remove domains on the fly
- 🗄️ **Persistent Storage**: SQLite database stores 30 days of historical data
- 🐳 **Docker Support**: Easy deployment with Docker Compose
- 🎨 **Modern UI**: Beautiful, responsive dashboard with dark mode aesthetics

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLModel**: SQL database interaction with Python type hints
- **APScheduler**: Background job scheduling for periodic pings
- **Uvicorn**: ASGI server for production deployment

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Chart.js**: Interactive time-series charts
- **Modern CSS**: Glassmorphism, gradients, and smooth animations
- **Google Fonts (Inter)**: Clean, professional typography

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone git@github.com:aaronarich/latency-tracker.git
   cd latency-tracker
   ```

2. **Start the application**:
   ```bash
   docker-compose up -d
   ```

3. **Access the dashboard**:
   Open your browser to [http://localhost:8000](http://localhost:8000)

### Manual Setup

1. **Clone the repository**:
   ```bash
   git clone git@github.com:aaronarich/latency-tracker.git
   cd latency-tracker
   ```

2. **Set up Python environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python main.py
   ```

4. **Access the dashboard**:
   Open your browser to [http://localhost:8000](http://localhost:8000)

## Default Tracked Domains

The application comes pre-configured to monitor:
- google.com
- icloud.com
- duckduckgo.com
- cloudflare.com
- fly.customer.io

You can add or remove domains through the settings interface (⚙️ icon in the header).

## API Endpoints

### Get Latency Data
```http
GET /latency?days=30
```
Returns latency records for the specified number of days (default: 30).

### Get Status
```http
GET /status
```
Returns the current status and list of tracked domains.

### List Domains
```http
GET /domains
```
Returns all currently tracked domains.

### Add Domain
```http
POST /domains
Content-Type: application/json

{
  "name": "example.com"
}
```

### Remove Domain
```http
DELETE /domains/{domain_name}
```

## Project Structure

```
latency_tracker/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database models and operations
│   ├── ping_service.py      # Ping functionality
│   ├── requirements.txt     # Python dependencies
│   └── venv/               # Virtual environment (not in git)
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Styling
│   └── app.js              # Frontend logic
├── data/                   # Persistent data directory
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Docker image definition
└── README.md              # This file
```

## Configuration

### Database
The application uses SQLite for data storage. By default:
- Database file: `data/latency.db`
- Retention period: 30 days
- Auto-cleanup runs during each ping cycle

### Ping Frequency
Pings are executed every 60 seconds by default. To modify this, edit the scheduler configuration in `backend/main.py`:

```python
scheduler.add_job(perform_pings, 'interval', minutes=1)  # Change minutes value
```

### Docker Environment Variables
You can customize the database path via environment variables in `docker-compose.yml`:

```yaml
environment:
  - DATABASE_PATH=/app/data/latency.db
```

## Development

### Running Tests
```bash
cd backend
pytest
```

### Code Style
The project follows PEP 8 guidelines for Python code.

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Ping Permission Issues
If you encounter permission errors when pinging:
- **Docker**: The container includes `NET_RAW` capability
- **Manual setup**: You may need to run with elevated privileges or configure ping permissions

### Port Already in Use
If port 8000 is already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Change 8080 to your preferred port
```

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- Icons from [Feather Icons](https://feathericons.com/)

## Author

**Aaron Rich**
- GitHub: [@aaronarich](https://github.com/aaronarich)

---

**Note**: This application performs network pings which may be subject to rate limiting or blocking by some networks. Use responsibly and in accordance with your network's acceptable use policy.
