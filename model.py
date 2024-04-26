import os
import torch
import joblib
import warnings
import numpy as np
import pandas as pd
import nltk
# nltk.download('punkt')

from tqdm.auto import tqdm
from nltk.data import load as nltk_load
from transformers import AutoTokenizer, AutoModelForCausalLM

import sys
import json
import random

# pip install scikit-learn==1.2.2

tqdm.pandas()
warnings.simplefilter('ignore')
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

model_id  = 'openai-community/gpt2'    # one of ['gpt2', 'gpt2-medium', 'gpt2-large']
tokenizer = AutoTokenizer.from_pretrained(model_id)
model     = AutoModelForCausalLM.from_pretrained(model_id)

CROSS_ENTROPY = torch.nn.CrossEntropyLoss(reduction='none')
NLTK = nltk_load('file:///C:/Users/skvto/OneDrive/Desktop/detAI/input/english.pickle')
CLF = joblib.load(r'C:\Users\skvto\OneDrive\Desktop\detAI\gptmodel\gpt2largemodel')

sent_cut_en = NLTK.tokenize

def gpt2_features(text, tokenizer, model, sent_cut):
    # Tokenize
    input_max_length = tokenizer.model_max_length - 2
    token_ids, offsets = list(), list()
    sentences = sent_cut(text)
    for s in sentences:
        tokens = tokenizer.tokenize(s)
        ids = tokenizer.convert_tokens_to_ids(tokens)
        difference = len(token_ids) + len(ids) - input_max_length
        if difference > 0:
            ids = ids[:-difference]
        offsets.append((len(token_ids), len(token_ids) + len(ids)))
        token_ids.extend(ids)
        if difference >= 0:
            break

    input_ids = torch.tensor([tokenizer.bos_token_id] + token_ids)
    logits = model(input_ids).logits
    # Shift so that n-1 predict n
    shift_logits = logits[:-1].contiguous()
    shift_target = input_ids[1:].contiguous()
    loss = CROSS_ENTROPY(shift_logits, shift_target)

    all_probs = torch.softmax(shift_logits, dim=-1)
    sorted_ids = torch.argsort(all_probs, dim=-1, descending=True)  # stable=True
    expanded_tokens = shift_target.unsqueeze(-1).expand_as(sorted_ids)
    indices = torch.where(sorted_ids == expanded_tokens)
    rank = indices[-1]
    counter = [
        rank < 10,
        (rank >= 10) & (rank < 100),
        (rank >= 100) & (rank < 1000),
        rank >= 1000
    ]
    counter = [c.long().sum(-1).item() for c in counter]


    # compute different-level ppl
    text_ppl = loss.mean().exp().item()
    sent_ppl = list()
    for start, end in offsets:
        nll = loss[start: end].sum() / (end - start)
        sent_ppl.append(nll.exp().item())
    max_sent_ppl = max(sent_ppl)
    sent_ppl_avg = sum(sent_ppl) / len(sent_ppl)
    if len(sent_ppl) > 1:
        sent_ppl_std = torch.std(torch.tensor(sent_ppl)).item()
    else:
        sent_ppl_std = 0

    mask = torch.tensor([1] * loss.size(0))
    step_ppl = loss.cumsum(dim=-1).div(mask.cumsum(dim=-1)).exp()
    max_step_ppl = step_ppl.max(dim=-1)[0].item()
    step_ppl_avg = step_ppl.sum(dim=-1).div(loss.size(0)).item()
    if step_ppl.size(0) > 1:
        step_ppl_std = step_ppl.std().item()
    else:
        step_ppl_std = 0
    ppls = [
        text_ppl, max_sent_ppl, sent_ppl_avg, sent_ppl_std,
        max_step_ppl, step_ppl_avg, step_ppl_std
    ]
    return ppls + counter  # type: ignore

def predict_out(features, classifier, id_to_label):
    x = np.asarray([features])
    pred = classifier.predict(x)[0]
    prob = classifier.predict_proba(x)[0, pred]
    return [id_to_label[pred], prob]

def predict(text):
    with torch.no_grad():
        feats = gpt2_features(text, tokenizer, model, sent_cut_en)
    out = predict_out(feats, CLF, ['Human Written', 'AI Generated'])
    return out

if __name__ == "__main__":
    text = sys.argv[1]
    ans = predict(text)
    ans[1] = rounded_num = round(ans[1], 4) ;
    if ans[0] == "Human Written":
        print(json.dumps(ans[1]*100))
    else:
        print(json.dumps((1-ans[1])*100))
