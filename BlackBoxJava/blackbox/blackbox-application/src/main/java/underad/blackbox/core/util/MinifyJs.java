package underad.blackbox.core.util;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.Writer;
import java.util.ArrayList;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import lombok.extern.slf4j.Slf4j;

import com.google.common.collect.ImmutableList;
import com.google.javascript.jscomp.CompilationLevel;
import com.google.javascript.jscomp.CompilerOptions;
import com.google.javascript.jscomp.JSError;
import com.google.javascript.jscomp.Result;
import com.google.javascript.jscomp.SourceFile;

public class MinifyJs implements Filter {
	
	// FIXME Broken. getOutputStream is being called rather than getWriter, even with gzipping disabled...
	// Read up here: http://www.oracle.com/technetwork/java/filters-137243.html
	// (Programming Customized Requests and Responses)

	// TODO how can we minify the JavaScript that comes out of Mustache? Quite important for "security through
	// obscurity" reasons... maybe with a Jersey interceptor?
	// https://jersey.java.net/documentation/latest/filters-and-interceptors.html#d0e8333
	// Unfortunately this is available from Jersey 2.x, and DropWizard is currently (2014-08-27) on 1.x.
	// Easiest answer: revisit once DW goes over to 2.x. This might also be helpful:
	// http://stackoverflow.com/questions/19785001/custom-method-annotation-using-jerseys-abstracthttpcontextinjectable-not-workin
	// Question posed here:
	// http://stackoverflow.com/questions/25546778/intercepting-http-response-body-in-dropwizard-0-7-0-jersey-1-x
	
	@Override
	public void destroy() {
		
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response,
			FilterChain chain) throws IOException, ServletException {
		ServletResponse wrapper = new MinifyingHttpServletResponseWrapper((HttpServletResponse) response);
		chain.doFilter(request, wrapper);
	}

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {
		
	}
}

class MinifyingHttpServletResponseWrapper extends HttpServletResponseWrapper {
	
	private MinifyingPrintWriter writer;
	
	public MinifyingHttpServletResponseWrapper(HttpServletResponse response) {
		super(response);
	}
	
	@Override
	public PrintWriter getWriter() throws IOException {
		if (writer == null) {
			writer = new MinifyingPrintWriter(getResponse().getWriter());
		}
		return writer;
	}
	
	@Override
	public ServletOutputStream getOutputStream() throws IOException {
		return getResponse().getOutputStream();
	}
}

@Slf4j
class MinifyingPrintWriter extends PrintWriter {
	private StringBuilder stringBuilder = new StringBuilder();
	private Writer wrapped;
	private boolean error;
	
	public MinifyingPrintWriter(Writer writer) {
		super(writer);
		this.wrapped = writer;
	}
	
	@Override
	public PrintWriter append(char c) {
		stringBuilder.append(c);
		return this;
	}
	
	@Override
	public PrintWriter append(CharSequence csq) {
		stringBuilder.append(csq);
		return this;
	}
	
	@Override
	public PrintWriter append(CharSequence csq, int start, int end) {
		stringBuilder.append(csq, start, end);
		return this;
	}
	
	@Override
	public void write(char[] buf) {
		stringBuilder.append(buf);
	}
	
	@Override
	public void write(char[] buf, int off, int len) {
		stringBuilder.append(buf, off, len);
	}
	
	@Override
	public void write(int c) {
		stringBuilder.append(c);
	}
	
	@Override
	public void write(String s) {
		stringBuilder.append(s);
	}
	
	@Override
	public void write(String s, int off, int len) {
		stringBuilder.append(s, off, len);
	}
	
	@Override
	public void flush() {
		com.google.javascript.jscomp.Compiler compiler = new com.google.javascript.jscomp.Compiler();
		
		CompilerOptions options = new CompilerOptions();
		CompilationLevel.ADVANCED_OPTIMIZATIONS.setOptionsForCompilationLevel(options);
		
		SourceFile input = SourceFile.fromCode("include.js", stringBuilder.toString());
		
		Result result = compiler.compile(new ArrayList<SourceFile>(), ImmutableList.of(input), options);
		for (JSError error : result.errors)
			log.warn("Google Closure Compiler reported error with generated JavaScript: " + error.toString());
		for (JSError warning : result.warnings)
			log.info("Google Closure code warning: " + warning.toString());
		
		String minifiedCode = compiler.toSource();
		
		try {
			wrapped.append(minifiedCode);
			wrapped.flush();
		} catch (IOException e) {
			error = true;
		}
	}
	
	@Override
	public boolean checkError() {
		return error;
	}
	
	@Override
	public void setError() {
		error = true;
	}
	
	@Override
	public void clearError() {
		error = false;
	}
}
