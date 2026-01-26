import subprocess
import re
import platform
import dns.resolver
import ipaddress

def resolve_domain(domain: str) -> str:
    """
    Resolves a domain to an IP address using Google DNS (8.8.8.8).
    Returns the original string if it is already an IP or if resolution fails.
    """
    # Check if it's already an IP address
    try:
        ipaddress.ip_address(domain)
        return domain
    except ValueError:
        pass

    try:
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ['8.8.8.8']
        answer = resolver.resolve(domain, 'A')
        return answer[0].to_text()
    except Exception as e:
        print(f"DNS resolution failed for {domain} via 8.8.8.8: {e}")
        return domain

def ping_domain(domain: str) -> float:
    """
    Pings a domain and returns the average latency in milliseconds.
    Returns -1.0 if the ping fails or can't be parsed.
    """
    target = resolve_domain(domain)
    print(f"Pinging {domain} ({target})...")

    param = '-c' if platform.system().lower() != 'windows' else '-n'
    command = ['ping', param, '1', target]
    
    try:
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, universal_newlines=True)
        # Search for "time=XX.X ms" or "time=X.XXXX ms"
        # Example output: 64 bytes from 142.250.190.46: icmp_seq=1 ttl=118 time=14.2 ms
        match = re.search(r'time=([\d.]+)\s*ms', output)
        if match:
            return float(match.group(1))
    except Exception as e:
        print(f"Error pinging {domain} ({target}): {e}")
    
    return -1.0

if __name__ == "__main__":
    domains = ["google.com", "icloud.com", "duckduckgo.com", "cloudflare.com", "fly.customer.io"]
    for d in domains:
        print(f"{d}: {ping_domain(d)}ms")
