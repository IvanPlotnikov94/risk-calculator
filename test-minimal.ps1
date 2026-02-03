Write-Host "Test 1"

if ($true) {
    Write-Host "Test 2"
} else {
    Write-Host "Test 3"
}

$userName = "test"
if ([string]::IsNullOrEmpty($userName)) {
    Write-Host "Empty"
}

Write-Host "Test 4"

if ($true) {
    Write-Host "Test 5"
} else {
    Write-Host "Test 6"
}

Write-Host "Done"
