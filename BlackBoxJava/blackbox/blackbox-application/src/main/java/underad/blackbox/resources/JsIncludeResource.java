package underad.blackbox.resources;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response.Status;

import org.joda.time.DateTime;

import underad.blackbox.core.AdvertMetadata;
import underad.blackbox.core.util.Crypto;
import underad.blackbox.jdbi.AdAugmentDao;
import underad.blackbox.jdbi.PublisherKeyDao;
import underad.blackbox.views.JsIncludeView;
import lombok.AllArgsConstructor;

import com.codahale.metrics.annotation.Timed;
import com.google.common.collect.ImmutableList;

@AllArgsConstructor
@Path("/jsinclude")
@Produces("application/javascript")
public class JsIncludeResource {
	private static final String RECONSTRUCT_URL = "http://www.unicorn.io/reconstruct";
	
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
	 * @param publisherUnixTimeSecs Unix time on publisher's server at point of sending request, in seconds.
	 * @return AdBlock-defeating JavaScript.
	 */
	@GET
	@Timed
	public JsIncludeView getInclude(@QueryParam("url") String url, @QueryParam("unixtime") long publisherUnixTimeSecs) {
	    try {
			new URI(url); // slightly clumsy validation... TODO can this be replaced with DW's validation stuff?
		} catch (URISyntaxException e) {
			throw new WebApplicationException(e, Status.BAD_REQUEST);
		}
	    
	    // Determine what adverts need obfuscating.
		List<AdvertMetadata> advertMetadata = ImmutableList.copyOf(adAugmentDao.getAdverts(url));
		// DateTime(long) expects millis since Unix epoch, not seconds.
		long publisherUnixTimeMillis = publisherUnixTimeSecs * 1000;
		DateTime publisherTs = new DateTime(publisherUnixTimeMillis);
		// Get appropriate key for encrypting paths.
		String key = publisherKeyDao.getKey(url, publisherTs);
		
		// The only URL we need to cipher in the blackbox is the reconstruct URL that provides adblock-proof ad HTML.
		String reconstructUrlCipherText = Crypto.encrypt(key, publisherUnixTimeMillis, RECONSTRUCT_URL);
		
		JsIncludeView view = new JsIncludeView(reconstructUrlCipherText, advertMetadata);
		
		// TODO how can we minify the JavaScript that comes out of Mustache? Quite important for "security through
		// obscurity" reasons... maybe with a Jersey interceptor?
		// https://jersey.java.net/documentation/latest/filters-and-interceptors.html#d0e8333
		return view;
	}
}
