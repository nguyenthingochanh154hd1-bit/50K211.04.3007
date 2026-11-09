namespace AppSolution.Application.Common;

public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Data { get; private set; }
    public string? ErrorMessage { get; private set; }
    public int StatusCode { get; private set; }

    private Result(bool isSuccess, T? data, string? errorMessage, int statusCode)
    {
        IsSuccess = isSuccess;
        Data = data;
        ErrorMessage = errorMessage;
        StatusCode = statusCode;
    }

    public static Result<T> Success(T data, int statusCode = 200) =>
        new(true, data, null, statusCode);

    public static Result<T> Failure(string errorMessage, int statusCode = 400) =>
        new(false, default, errorMessage, statusCode);
}

public class Result
{
    public bool IsSuccess { get; private set; }
    public string? ErrorMessage { get; private set; }
    public int StatusCode { get; private set; }

    private Result(bool isSuccess, string? errorMessage, int statusCode)
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
        StatusCode = statusCode;
    }

    public static Result Success(int statusCode = 200) => new(true, null, statusCode);
    public static Result Failure(string errorMessage, int statusCode = 400) => new(false, errorMessage, statusCode);
}
