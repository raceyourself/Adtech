package underad.blackbox.resources;

import java.io.IOException;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response.Status;

import underad.blackbox.client.HttpConsumer;
import lombok.AllArgsConstructor;

import com.codahale.metrics.annotation.Timed;

@AllArgsConstructor
@Path("/reconstruct")
@Produces(MediaType.TEXT_HTML)
public class ReconstructResource {
	
	private HttpConsumer httpConsumer;
	
	/**
	 * <ol>
	 * 	<li>Retrieves fresh style information from <code>url</code> for the advert found at <code>advertXpath</code>.</li>
	 * 	<li>Determines an appropriate alternative advert for this space.</li>
	 *  <li>Returns CSS styles for elements in or below the specified XPath.
	 * </ol>
	 * 
	 * @param url Page we need to insert an underad into. Used to retrieve fresh style info for the original ad.
	 * @param blockedAbsXpath Ad blockers often hide several layers of parent elements of the advert itself. This is the
	 * absolute path to the top-level element hidden by AdBlock. Often these layers are used for positioning.
	 * @param advertRelXpath Relative path to the element within blockedAbsXpath that contains the advert resources.
	 * @return HTML containing an underad appropriate for insertion alongside blockedAbsXpath.
	 */
	@GET
	@Timed
	public String reconstructAdvert(
			@QueryParam("url") String url,
			@QueryParam("blockedAbsXpath") String blockedAbsXpath,
			@QueryParam("advertRelXpath") String advertRelXpath) {
		String page;
		try {
			page = httpConsumer.responseAsString(url);
		} catch (IOException e) {
			throw new WebApplicationException(e, Status.INTERNAL_SERVER_ERROR);
		}
		
		return null;
//		return new Saying(counter.incrementAndGet(), value);
	}
}
