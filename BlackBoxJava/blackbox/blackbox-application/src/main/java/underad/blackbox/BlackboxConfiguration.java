package underad.blackbox;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

import io.dropwizard.Configuration;
import io.dropwizard.db.DataSourceFactory;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.validator.constraints.NotEmpty;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
public class BlackboxConfiguration extends Configuration {
	@NotEmpty
	@JsonProperty
	private String template;
	@NotEmpty
	@JsonProperty
	private String defaultName = "Stranger";
	
	@Valid
	@NotNull
	@JsonProperty("database")
	private DataSourceFactory dataSourceFactory = new DataSourceFactory();
}
