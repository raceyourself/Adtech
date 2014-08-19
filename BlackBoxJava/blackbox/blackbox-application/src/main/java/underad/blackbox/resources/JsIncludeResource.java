package underad.blackbox.resources;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;

import lombok.AllArgsConstructor;

import com.codahale.metrics.annotation.Timed;

@AllArgsConstructor
@Path("/reconstruct")
@Produces("application/javascript")
public class JsIncludeResource {
	
	/**
	 * Returns JavaScript code required to:
	 * 
	 * 1. Detect whether the adverts in the page have been blocked,
	 * 2. Retrieve fresh styling information (via ReconstructResource) for blocked adverts, including references to new,
	 * 'underad'-style 'adblock-proof' advert resources (images, JS, etc).
	 * 
	 * @param url The page serving the ads, i.e. that will link to this include.
	 * @return AdBlock-defeating JavaScript.
	 */
	@GET
	@Timed
	public String getInclude(@QueryParam("url") String url) {
		return null;
	}
}
