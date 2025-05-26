```shell
nsys profile \
	-w true \
	--cuda-memory-usage=true \
	--python-backtrace=cuda \
	-s cpu \
	-f true \
	-x true \
	-o baseline \
	python3.9 -m xllm.service.rpc.ark.serve --model-dir /app/model/custom-llm/doubao-lite-p6-hf-st.enc
```