package underad.blackbox.client;

import java.io.IOException;

import javax.validation.constraints.NotNull;

import lombok.AllArgsConstructor;

import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.BasicResponseHandler;

@AllArgsConstructor
public class HttpConsumer {
	
	private final HttpClient httpClient;
	
	@NotNull
	public String responseAsString(String url) throws IOException {
		HttpGet httpGet = new HttpGet(url);
		ResponseHandler<String> responseHandler = new BasicResponseHandler();
		try {
			return httpClient.execute(httpGet, responseHandler);
		} finally {
			httpGet.releaseConnection();
		}
	}
}
