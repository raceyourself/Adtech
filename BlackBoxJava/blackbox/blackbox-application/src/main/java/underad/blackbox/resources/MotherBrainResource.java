package underad.blackbox.resources;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import lombok.extern.slf4j.Slf4j;

import com.codahale.metrics.annotation.Timed;

/**
 * Produces an advert based off the specified dimensions/ad context.
 * 
 * @author Duncan
 */
@Slf4j
@Path("/adbrain")
@Produces(MediaType.TEXT_HTML)
public class MotherBrainResource {
	@GET
	@Timed
	public String getAdvert(
			@QueryParam("widthWithUnit") String widthWithUnit,
			@QueryParam("heightWithUnit") String heightWithUnit) {
		log.debug("Requested ad with dimensions ({},{}. Providing Yoshi.)", widthWithUnit, heightWithUnit);
		return "<img width=\"" + widthWithUnit + "\" height=\"" + heightWithUnit + "\" " +
			"src=\"http://img3.wikia.nocookie.net/__cb20130809134512/mario/fr/images/7/75/Yoshi-gymnasticd-yoshi-31522962-900-1203.png\" />";
	}
}
