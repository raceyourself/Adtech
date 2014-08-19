package underad.blackbox.resources;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collection;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response.Status;

import org.joda.time.DateTime;

import underad.blackbox.jdbi.AdAugmentDao;
import underad.blackbox.jdbi.AdAugmentDao.AdvertMetadata;
import underad.blackbox.jdbi.PublisherKeyDao;
import lombok.AllArgsConstructor;

import com.codahale.metrics.annotation.Timed;

@AllArgsConstructor
@Path("/reconstruct")
@Produces("application/javascript")
public class JsIncludeResource {
	private final AdAugmentDao adAugmentDao;
	private final PublisherKeyDao publisherKeyDao;
	
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
	public String getInclude(@QueryParam("url") String url, @QueryParam("datetime") DateTime publisherTs) {
	    URI uri;
		try {
			uri = new URI(url);
		} catch (URISyntaxException e) {
			throw new WebApplicationException(e, Status.BAD_REQUEST);
		}
	    String host = uri.getHost();

		Collection<AdvertMetadata> advertMetadata = adAugmentDao.getAdverts(url);
		String key = publisherKeyDao.getKey(host, publisherTs);
		
		return null;
	}
}
