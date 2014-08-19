package underad.blackbox.resources;

import java.util.concurrent.atomic.AtomicLong;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import underad.blackbox.api.Saying;
import lombok.AllArgsConstructor;

import com.codahale.metrics.annotation.Timed;
import com.google.common.base.Optional;

@AllArgsConstructor
@Path("/hello_world")
@Produces(MediaType.APPLICATION_JSON)
public class BlackboxResource {
	private final String template;
	private final String defaultName;
	private final AtomicLong counter = new AtomicLong();
	
	@GET
	@Timed
	public Saying sayHello(@QueryParam("name") Optional<String> name) {
		final String value = String.format(template, name.or(defaultName));
		return new Saying(counter.incrementAndGet(), value);
	}
}
