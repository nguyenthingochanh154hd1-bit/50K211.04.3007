using AppSolution.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace AppSolution.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (!result.IsSuccess)
        {
            return result.StatusCode switch
            {
                404 => NotFound(new { error = result.ErrorMessage }),
                401 => Unauthorized(new { error = result.ErrorMessage }),
                409 => Conflict(new { error = result.ErrorMessage }),
                _ => BadRequest(new { error = result.ErrorMessage })
            };
        }

        return result.StatusCode switch
        {
            201 => StatusCode(201, result.Data),
            204 => NoContent(),
            _ => Ok(result.Data)
        };
    }

    protected IActionResult HandleResult(Result result)
    {
        if (!result.IsSuccess)
        {
            return result.StatusCode switch
            {
                404 => NotFound(new { error = result.ErrorMessage }),
                401 => Unauthorized(new { error = result.ErrorMessage }),
                _ => BadRequest(new { error = result.ErrorMessage })
            };
        }

        return result.StatusCode == 204 ? NoContent() : Ok();
    }
}
