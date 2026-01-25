import subprocess
import re
import platform

def ping_domain(domain: str) -> float:
    """
    Pings a domain and returns the average latency in milliseconds.
    Returns -1.0 if the ping fails or can't be parsed.
    """
    param = '-c' if platform.system().lower() != 'windows' else '-n'
    command = ['ping', param, '1', domain]
    
    try:
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, universal_newlines=True)
        # Search for "time=XX.X ms" or "time=X.XXXX ms"
        # Example output: 64 bytes from 142.250.190.46: icmp_seq=1 ttl=118 time=14.2 ms
        match = re.search(r'time=([\d.]+)\s*ms', output)
        if match:
            return float(match.group(1))
    except Exception as e:
        print(f"Error pinging {domain}: {e}")
    
    return -1.0

if __name__ == "__main__":
    domains = ["google.com", "icloud.com", "duckduckgo.com", "cloudflare.com", "fly.customer.io"]
    for d in domains:
        print(f"{d}: {ping_domain(d)}ms")
