package underad.blackbox;

import io.dropwizard.Configuration;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.validator.constraints.NotEmpty;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
public class BlackboxConfig extends Configuration {
	@NotEmpty
	@JsonProperty
	private String template;
	@NotEmpty
	@JsonProperty
	private String defaultName = "Stranger";
	
}
