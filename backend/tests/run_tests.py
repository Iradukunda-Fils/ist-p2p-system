#!/usr/bin/env python
"""
Test runner for P2P Procurement System backend tests.

This script runs all organized tests in the proper order:
1. Unit tests (authentication, validation, etc.)
2. Integration tests (Celery, full workflows)
3. API tests (endpoint testing)
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Colors for output
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_header(text):
    """Print a colored header."""
    print(f"\n{BLUE}{'='*80}{NC}")
    print(f"{BLUE}{text.center(80)}{NC}")
    print(f"{BLUE}{'='*80}{NC}")

def print_success(text):
    """Print success message."""
    print(f"{GREEN}✓ {text}{NC}")

def print_error(text):
    """Print error message."""
    print(f"{RED}✗ {text}{NC}")

def print_warning(text):
    """Print warning message."""
    print(f"{YELLOW}⚠ {text}{NC}")

def run_test_file(test_file, test_type="Unit"):
    """Run a single test file and return success status."""
    print(f"\n{YELLOW}Running {test_type} Test: {test_file.name}{NC}")
    print("-" * 60)
    
    try:
        # Run the test file
        result = subprocess.run([sys.executable, str(test_file)], 
                              capture_output=False, 
                              text=True, 
                              cwd=test_file.parent)
        
        if result.returncode == 0:
            print_success(f"{test_file.name} passed")
            return True
        else:
            print_error(f"{test_file.name} failed with exit code {result.returncode}")
            return False
            
    except Exception as e:
        print_error(f"Error running {test_file.name}: {e}")
        return False

def main():
    """Run all tests in organized order."""
    print_header("P2P PROCUREMENT SYSTEM - TEST RUNNER")
    
    # Get the tests directory
    tests_dir = Path(__file__).parent
    
    # Track test results
    results = {
        'unit': [],
        'integration': [],
        'api': []
    }
    
    # 1. Run Unit Tests
    print_header("UNIT TESTS")
    unit_tests_dir = tests_dir / 'unit'
    
    if unit_tests_dir.exists():
        unit_test_files = sorted(unit_tests_dir.glob('test_*.py'))
        
        for test_file in unit_test_files:
            success = run_test_file(test_file, "Unit")
            results['unit'].append((test_file.name, success))
    else:
        print_warning("Unit tests directory not found")
    
    # 2. Run Integration Tests
    print_header("INTEGRATION TESTS")
    integration_tests_dir = tests_dir / 'integration'
    
    if integration_tests_dir.exists():
        integration_test_files = sorted(integration_tests_dir.glob('test_*.py'))
        
        for test_file in integration_test_files:
            success = run_test_file(test_file, "Integration")
            results['integration'].append((test_file.name, success))
    else:
        print_warning("Integration tests directory not found")
    
    # 3. Run API Tests
    print_header("API TESTS")
    api_tests_dir = tests_dir / 'api'
    
    if api_tests_dir.exists():
        api_test_files = sorted(api_tests_dir.glob('test_*.py'))
        
        for test_file in api_test_files:
            success = run_test_file(test_file, "API")
            results['api'].append((test_file.name, success))
    else:
        print_warning("API tests directory not found")
    
    # Print Summary
    print_header("TEST RESULTS SUMMARY")
    
    total_tests = 0
    total_passed = 0
    
    for test_type, test_results in results.items():
        if test_results:
            print(f"\n{BLUE}{test_type.upper()} TESTS:{NC}")
            for test_name, success in test_results:
                total_tests += 1
                if success:
                    total_passed += 1
                    print_success(test_name)
                else:
                    print_error(test_name)
    
    # Final Summary
    print(f"\n{BLUE}OVERALL RESULTS:{NC}")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_tests - total_passed}")
    
    if total_passed == total_tests:
        print_success("All tests passed! 🎉")
        return 0
    else:
        print_error(f"{total_tests - total_passed} test(s) failed")
        return 1

if __name__ == '__main__':
    # exit_code = main()
    # sys.exit(exit_code)