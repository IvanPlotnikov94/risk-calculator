$test = $true

if ($test)
{
    Write-Host "Test 1"
    
    if ($test)
    {
        Write-Host "Test 2"
    }
    else
    {
        Write-Host "Test 3"
    }
}
else
{
    Write-Host "Test 4"
}

Write-Host "Done"
